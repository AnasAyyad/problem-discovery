import { env } from "../../config/env.js";
import { createPipelineStopError } from "../../lib/pipeline-stop.js";

import { searchHackerNews } from "./hackernews/hackernews.client.js";
import { mapHackerNewsHits } from "./hackernews/hackernews.mapper.js";
import { getDiscoveryKeywords } from "./ingestion.keywords.js";
import {
  getSourceCheckpoint,
  insertSignalEvents,
  upsertSourceCheckpoint,
} from "./ingestion.repository.js";
import type {
  ComplaintFetchResult,
  IngestionSourceDefinition,
  SignalFetchResult,
  SourceFetchContext,
} from "./ingestion.registry.js";
import { ingestProductHuntSignals } from "./producthunt/producthunt.ingest.js";
import { hasRedditCredentials } from "./reddit/reddit.client.js";
import { ingestRedditHot } from "./reddit/reddit.ingest.js";
import { ingestStackExchangeSearches } from "./stackexchange/stackexchange.ingest.js";
import { persistIngestedItems } from "./ingestion.service.js";
import { ingestGenericWebSource } from "./web/web.ingest.js";
import { ingestGitHubIssues } from "./github/github.ingest.js";
import { ingestGoogleTrendsSignals } from "./googletrends/googletrends.ingest.js";
import type { IngestionSourceResult } from "./ingestion.types.js";

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface IngestionRunnerProgressEvent {
  type: "source_completed" | "source_skipped" | "source_failed";
  sourceResult: IngestionSourceResult;
}

export interface IngestionRunOptions {
  subreddit?: string;
  discoveryKeywords?: string[];
  webUrls?: string[];
  ingestLimit?: number;
  onProgress?: (event: IngestionRunnerProgressEvent) => void | Promise<void>;
  shouldStop?: () => Promise<boolean>;
}

const ingestionSources: IngestionSourceDefinition[] = [
  {
    id: "reddit",
    kind: "complaint",
    checkpointKey: (context) => `subreddit:${context.subreddit}`,
    isEnabled: () => hasRedditCredentials(),
    disabledReason: () => "Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET",
    fetchBatch: async (context) => {
      const result = await ingestRedditHot(
        context.subreddit,
        context.ingestLimit,
      );
      return { items: [] } satisfies ComplaintFetchResult & { meta?: unknown }; // placeholder replaced below
    },
  },
  {
    id: "hackernews",
    kind: "complaint",
    checkpointKey: () => "global-keywords",
    isEnabled: () => true,
    fetchBatch: async (context) => {
      const queries = context.discoveryKeywords;
      const fromUnix = context.checkpoint?.unixTimestamp ?? undefined;
      const limit = context.ingestLimit ?? 25;
      const items = [];
      let maxCreationUnix = fromUnix ?? 0;

      for (const query of queries) {
        const payload = await searchHackerNews(query, limit, fromUnix);
        const mapped = mapHackerNewsHits(query, payload);
        items.push(...mapped);

        for (const item of mapped) {
          const createdAtUnix = item.createdAt
            ? Math.floor(new Date(item.createdAt).getTime() / 1000)
            : 0;
          if (createdAtUnix > 0) {
            maxCreationUnix = Math.max(maxCreationUnix, createdAtUnix);
          }
        }
      }

      const uniqueItems = items.filter(
        (item, index, allItems) =>
          allItems.findIndex(
            (candidate) => candidate.externalId === item.externalId,
          ) === index,
      );

      return {
        items: uniqueItems,
        checkpoint:
          maxCreationUnix > 0
            ? { unixTimestamp: maxCreationUnix }
            : (context.checkpoint ?? null),
      };
    },
  },
  {
    id: "web",
    kind: "complaint",
    checkpointKey: (context) =>
      `urls:${context.webUrls.join("|") || "env-default"}`,
    isEnabled: (context) =>
      context.webUrls.length > 0 || env.WEB_INGEST_URLS.trim().length > 0,
    disabledReason: () => "No WEB_INGEST_URLS configured",
    fetchBatch: async (context) => {
      const result = await ingestGenericWebSource(
        context.webUrls,
        context.ingestLimit,
      );
      const items = result.urls.length === 0 ? [] : []; // placeholder, fetcher persists directly today
      return { items };
    },
  },
  {
    id: "stackexchange",
    kind: "complaint",
    checkpointKey: (context) =>
      `sites:${parseCsv(env.STACKEXCHANGE_SITES).join("|")}::keywords:${context.discoveryKeywords.join("|")}`,
    isEnabled: () => parseCsv(env.STACKEXCHANGE_SITES).length > 0,
    disabledReason: () => "No STACKEXCHANGE_SITES configured",
    fetchBatch: async (context) => {
      const result = await ingestStackExchangeSearches({
        discoveryKeywords: context.discoveryKeywords,
        sites: parseCsv(env.STACKEXCHANGE_SITES),
        ...(context.checkpoint !== undefined
          ? { checkpoint: context.checkpoint }
          : {}),
        ...(context.ingestLimit ? { limit: context.ingestLimit } : {}),
      });
      return {
        items: [],
        checkpoint: result.checkpoint,
      };
    },
  },
  {
    id: "github",
    kind: "complaint",
    checkpointKey: (context) =>
      `repos:${env.GITHUB_REPOS}::orgs:${env.GITHUB_ORGS}::keywords:${context.discoveryKeywords.join("|")}`,
    isEnabled: () =>
      Boolean(
        env.GITHUB_TOKEN && (env.GITHUB_REPOS.trim() || env.GITHUB_ORGS.trim()),
      ),
    disabledReason: () =>
      "Missing GITHUB_TOKEN or GitHub repo/org allowlist configuration",
    fetchBatch: async (context) => {
      const result = await ingestGitHubIssues({
        discoveryKeywords: context.discoveryKeywords,
        ...(context.checkpoint !== undefined
          ? { checkpoint: context.checkpoint }
          : {}),
        ...(context.ingestLimit ? { limit: context.ingestLimit } : {}),
      });
      return {
        items: [],
        checkpoint: result.checkpoint,
      };
    },
  },
  {
    id: "producthunt",
    kind: "signal",
    checkpointKey: () => "producthunt-default",
    isEnabled: () =>
      env.PRODUCT_HUNT_ENABLED && Boolean(env.PRODUCT_HUNT_TOKEN),
    disabledReason: () =>
      "Product Hunt signal source is disabled or missing PRODUCT_HUNT_TOKEN",
    fetchBatch: async (context) =>
      ingestProductHuntSignals({
        ...(context.checkpoint !== undefined
          ? { checkpoint: context.checkpoint }
          : {}),
        ...(context.ingestLimit ? { limit: context.ingestLimit } : {}),
      }),
  },
  {
    id: "googletrends",
    kind: "signal",
    checkpointKey: (context) =>
      `keywords:${context.discoveryKeywords.join("|")}`,
    isEnabled: () => env.GOOGLE_TRENDS_ENABLED,
    disabledReason: () => "Google Trends signal source is disabled",
    fetchBatch: async (context) =>
      ingestGoogleTrendsSignals({
        ...(context.checkpoint !== undefined
          ? { checkpoint: context.checkpoint }
          : {}),
      }),
  },
];

async function runComplaintSource(
  source: IngestionSourceDefinition,
  context: SourceFetchContext,
): Promise<IngestionSourceResult> {
  if (source.id === "reddit") {
    const result = await ingestRedditHot(
      context.subreddit,
      context.ingestLimit,
    );
    return {
      source: source.id,
      kind: source.kind,
      status: "completed",
      fetchedCount: result.fetchedCount,
      persistedCount: result.persistedCount,
    };
  }

  if (source.id === "web") {
    const result = await ingestGenericWebSource(
      context.webUrls,
      context.ingestLimit,
    );
    return {
      source: source.id,
      kind: source.kind,
      status: "completed",
      fetchedCount: result.fetchedCount,
      persistedCount: result.persistedCount,
    };
  }

  if (source.id === "stackexchange") {
    const result = await ingestStackExchangeSearches({
      discoveryKeywords: context.discoveryKeywords,
      sites: parseCsv(env.STACKEXCHANGE_SITES),
      ...(context.checkpoint !== undefined
        ? { checkpoint: context.checkpoint }
        : {}),
      ...(context.ingestLimit ? { limit: context.ingestLimit } : {}),
    });
    await upsertSourceCheckpoint(
      source.id,
      source.checkpointKey(context),
      result.checkpoint,
    );
    return {
      source: source.id,
      kind: source.kind,
      status: "completed",
      fetchedCount: result.fetchedCount,
      persistedCount: result.persistedCount,
    };
  }

  if (source.id === "github") {
    const result = await ingestGitHubIssues({
      discoveryKeywords: context.discoveryKeywords,
      ...(context.checkpoint !== undefined
        ? { checkpoint: context.checkpoint }
        : {}),
      ...(context.ingestLimit ? { limit: context.ingestLimit } : {}),
    });
    await upsertSourceCheckpoint(
      source.id,
      source.checkpointKey(context),
      result.checkpoint,
    );
    return {
      source: source.id,
      kind: source.kind,
      status: "completed",
      fetchedCount: result.fetchedCount,
      persistedCount: result.persistedCount,
    };
  }

  const fetchResult = (await source.fetchBatch(
    context,
  )) as ComplaintFetchResult;
  const persistResult = await persistIngestedItems(
    source.id,
    fetchResult.items,
  );
  await upsertSourceCheckpoint(
    source.id,
    source.checkpointKey(context),
    fetchResult.checkpoint,
  );

  return {
    source: source.id,
    kind: source.kind,
    status: "completed",
    fetchedCount: persistResult.fetchedCount,
    persistedCount: persistResult.persistedCount,
  };
}

async function runSignalSource(
  source: IngestionSourceDefinition,
  context: SourceFetchContext,
): Promise<IngestionSourceResult> {
  const result = (await source.fetchBatch(context)) as SignalFetchResult;
  const persistedCount = await insertSignalEvents(result.signals);
  await upsertSourceCheckpoint(
    source.id,
    source.checkpointKey(context),
    result.checkpoint,
  );

  return {
    source: source.id,
    kind: source.kind,
    status: "completed",
    fetchedCount: result.signals.length,
    persistedCount,
  };
}

async function runSource(
  source: IngestionSourceDefinition,
  context: SourceFetchContext,
  onProgress?: (event: IngestionRunnerProgressEvent) => void | Promise<void>,
): Promise<IngestionSourceResult> {
  if (!source.isEnabled(context)) {
    const sourceResult: IngestionSourceResult = {
      source: source.id,
      kind: source.kind,
      status: "skipped",
      fetchedCount: 0,
      persistedCount: 0,
      message: source.disabledReason?.(context) ?? "Source disabled",
    };
    await onProgress?.({
      type: "source_skipped",
      sourceResult,
    });
    return sourceResult;
  }

  try {
    const sourceResult =
      source.kind === "complaint"
        ? await runComplaintSource(source, context)
        : await runSignalSource(source, context);
    await onProgress?.({
      type: "source_completed",
      sourceResult,
    });
    return sourceResult;
  } catch (error: unknown) {
    const sourceResult: IngestionSourceResult = {
      source: source.id,
      kind: source.kind,
      status: "failed",
      fetchedCount: 0,
      persistedCount: 0,
      message:
        error instanceof Error ? error.message : "Unknown ingestion error",
    };
    await onProgress?.({
      type: "source_failed",
      sourceResult,
    });
    return sourceResult;
  }
}

export async function runIngestionSources(
  options?: IngestionRunOptions,
): Promise<{
  sourceResults: IngestionSourceResult[];
  fetchedCount: number;
  persistedCount: number;
}> {
  const subreddit = options?.subreddit ?? "smallbusiness";
  const discoveryKeywords = getDiscoveryKeywords(options?.discoveryKeywords);
  const webUrls = options?.webUrls ?? [];
  const sourceResults: IngestionSourceResult[] = [];

  for (const source of ingestionSources) {
    if (options?.shouldStop && (await options.shouldStop())) {
      throw createPipelineStopError();
    }

    const baseContext: SourceFetchContext = {
      subreddit,
      discoveryKeywords,
      webUrls,
      ...(options?.ingestLimit ? { ingestLimit: options.ingestLimit } : {}),
      checkpoint: null,
    };
    const checkpointKey = source.checkpointKey(baseContext);
    const checkpoint = await getSourceCheckpoint(source.id, checkpointKey);
    const sourceResult = await runSource(
      source,
      {
        ...baseContext,
        checkpoint,
      },
      options?.onProgress,
    );
    sourceResults.push(sourceResult);
  }

  return {
    sourceResults,
    fetchedCount: sourceResults.reduce(
      (sum, result) => sum + result.fetchedCount,
      0,
    ),
    persistedCount: sourceResults.reduce(
      (sum, result) => sum + result.persistedCount,
      0,
    ),
  };
}
