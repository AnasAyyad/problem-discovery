import { env } from '../../config/env.js';

import { ingestHackerNewsSearches } from './hackernews/hackernews.ingest.js';
import { hasRedditCredentials } from './reddit/reddit.client.js';
import { ingestRedditHot } from './reddit/reddit.ingest.js';
import { ingestGenericWebSource } from './web/web.ingest.js';
import type { IngestionSourceResult } from './ingestion.types.js';

export interface IngestionRunnerProgressEvent {
  type: 'source_completed' | 'source_skipped' | 'source_failed';
  sourceResult: IngestionSourceResult;
}

export interface IngestionRunOptions {
  subreddit?: string;
  discoveryKeywords?: string[];
  webUrls?: string[];
  ingestLimit?: number;
  onProgress?: (event: IngestionRunnerProgressEvent) => void;
}

async function runOptionalIngestionSource(
  source: string,
  work: () => Promise<{ fetchedCount: number; persistedCount: number; }>,
  onProgress?: (event: IngestionRunnerProgressEvent) => void
): Promise<IngestionSourceResult> {
  try {
    const result = await work();
    const sourceResult: IngestionSourceResult = {
      source,
      status: 'completed',
      fetchedCount: result.fetchedCount,
      persistedCount: result.persistedCount
    };
    onProgress?.({
      type: 'source_completed',
      sourceResult
    });
    return sourceResult;
  } catch (error: unknown) {
    const sourceResult: IngestionSourceResult = {
      source,
      status: 'failed',
      fetchedCount: 0,
      persistedCount: 0,
      message: error instanceof Error ? error.message : 'Unknown ingestion error'
    };
    onProgress?.({
      type: 'source_failed',
      sourceResult
    });
    return sourceResult;
  }
}

export async function runIngestionSources(options?: IngestionRunOptions): Promise<{
  sourceResults: IngestionSourceResult[];
  fetchedCount: number;
  persistedCount: number;
}> {
  const subreddit = options?.subreddit ?? 'smallbusiness';
  const onProgress = options?.onProgress;
  const ingestLimit = options?.ingestLimit;
  const sourceResults: IngestionSourceResult[] = [];

  if (hasRedditCredentials()) {
    sourceResults.push(
      await runOptionalIngestionSource('reddit', async () => ingestRedditHot(subreddit, ingestLimit), onProgress)
    );
  } else {
    const sourceResult: IngestionSourceResult = {
      source: 'reddit',
      status: 'skipped',
      fetchedCount: 0,
      persistedCount: 0,
      message: 'Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET'
    };
    sourceResults.push(sourceResult);
    onProgress?.({
      type: 'source_skipped',
      sourceResult
    });
  }

  sourceResults.push(
    await runOptionalIngestionSource(
      'hackernews',
      async () => ingestHackerNewsSearches(options?.discoveryKeywords, ingestLimit),
      onProgress
    )
  );

  const hasWebUrls = (options?.webUrls && options.webUrls.length > 0) || env.WEB_INGEST_URLS.trim();

  if (hasWebUrls) {
    sourceResults.push(
      await runOptionalIngestionSource(
        'web',
        async () => ingestGenericWebSource(options?.webUrls, ingestLimit),
        onProgress
      )
    );
  } else {
    const sourceResult: IngestionSourceResult = {
      source: 'web',
      status: 'skipped',
      fetchedCount: 0,
      persistedCount: 0,
      message: 'No WEB_INGEST_URLS configured'
    };
    sourceResults.push(sourceResult);
    onProgress?.({
      type: 'source_skipped',
      sourceResult
    });
  }

  return {
    sourceResults,
    fetchedCount: sourceResults.reduce((sum, result) => sum + result.fetchedCount, 0),
    persistedCount: sourceResults.reduce((sum, result) => sum + result.persistedCount, 0)
  };
}
