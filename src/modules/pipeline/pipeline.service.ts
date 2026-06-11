import { pool } from "../../db/pool.js";
import { AppError } from "../../lib/errors.js";
import { createPipelineStopError } from "../../lib/pipeline-stop.js";
import { runIngestionSources } from "../ingestion/ingestion.runner.js";
import { embedPendingSourceItems } from "../embeddings/embeddings.service.js";
import { extractPendingSourceItems } from "../extraction/extraction.service.js";
import { materializeOpportunities } from "../opportunities/opportunity.service.js";
import { nowIso } from "../../lib/time.js";

import {
  finishPipelineStep,
  startPipelineStep,
} from "./pipeline.repository.js";

import type { PipelineRunSummary } from "./pipeline.types.js";

const PIPELINE_ADVISORY_LOCK_KEY = 4_240_001;

interface EmbeddingProgressEvent {
  stage: "started" | "item_completed";
  total: number;
  completed: number;
  sourceItemId?: number;
}

interface ExtractionProgressEvent {
  stage: "started" | "item_succeeded" | "item_failed";
  total: number;
  completed: number;
  successCount: number;
  failureCount: number;
  sourceItemId?: number;
  errorMessage?: string;
}

export interface PipelineProgressEvent {
  type:
    | "step_started"
    | "step_completed"
    | "ingestion_source_completed"
    | "ingestion_source_skipped"
    | "ingestion_source_failed"
    | "embedding_started"
    | "embedding_progress"
    | "extraction_started"
    | "extraction_progress";
  step?: string;
  message?: string;
  meta?: unknown;
}

export interface PipelineRunOptions {
  subreddit?: string;
  discoveryKeywords?: string[];
  webUrls?: string[];
  ingestLimit?: number;
  embedLimit?: number;
  extractLimit?: number;
  onProgress?: (event: PipelineProgressEvent) => void | Promise<void>;
  shouldStop?: () => Promise<boolean>;
}

async function throwIfStopped(
  shouldStop?: () => Promise<boolean>,
): Promise<void> {
  if (shouldStop && (await shouldStop())) {
    throw createPipelineStopError();
  }
}

async function withPipelineLock<T>(work: () => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [PIPELINE_ADVISORY_LOCK_KEY],
    );
    const locked = result.rows[0]?.locked ?? false;

    if (!locked) {
      throw new AppError(
        "Pipeline is already running. Wait for the current run to finish before starting another.",
        409,
      );
    }

    try {
      return await work();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [
        PIPELINE_ADVISORY_LOCK_KEY,
      ]);
    }
  } finally {
    client.release();
  }
}

export async function isPipelineLockHeld(): Promise<boolean> {
  const client = await pool.connect();

  try {
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [PIPELINE_ADVISORY_LOCK_KEY],
    );
    const locked = result.rows[0]?.locked ?? false;

    if (locked) {
      await client.query("SELECT pg_advisory_unlock($1)", [
        PIPELINE_ADVISORY_LOCK_KEY,
      ]);
    }

    return !locked;
  } finally {
    client.release();
  }
}

async function runTrackedStep<T extends Record<string, unknown>>(
  name: string,
  meta: Record<string, unknown>,
  work: () => Promise<T>,
  onProgress?: (event: PipelineProgressEvent) => void | Promise<void>,
  shouldStop?: () => Promise<boolean>,
): Promise<{ name: string; status: "completed"; meta: T }> {
  await throwIfStopped(shouldStop);
  const runId = await startPipelineStep(name, meta);
  await onProgress?.({
    type: "step_started",
    step: name,
    meta,
  });

  try {
    const result = await work();
    await throwIfStopped(shouldStop);
    await finishPipelineStep(runId, "completed", result);
    await onProgress?.({
      type: "step_completed",
      step: name,
      meta: result,
    });
    return {
      name,
      status: "completed",
      meta: result,
    };
  } catch (error: unknown) {
    await finishPipelineStep(
      runId,
      "failed",
      meta,
      error instanceof Error ? error.message : "Unknown pipeline error",
    );
    throw error;
  }
}

export async function runPipeline(
  options?: PipelineRunOptions,
): Promise<PipelineRunSummary> {
  return withPipelineLock(async () => {
    const subreddit = options?.subreddit ?? "smallbusiness";
    const ingestLimit = options?.ingestLimit;
    const embedLimit = options?.embedLimit;
    const extractLimit = options?.extractLimit;
    const effectiveEmbedLimit = embedLimit ?? ingestLimit;
    const startedAt = nowIso();
    const onProgress = options?.onProgress;
    const shouldStop = options?.shouldStop;

    const ingestStep = await runTrackedStep(
      "ingest",
      {
        subreddit,
        discoveryKeywords: options?.discoveryKeywords ?? null,
        webUrls: options?.webUrls ?? null,
        ingestLimit: ingestLimit ?? null,
        embedLimit: effectiveEmbedLimit ?? null,
        extractLimit: extractLimit ?? null,
      },
      async () =>
        runIngestionSources({
          subreddit,
          ...(options?.discoveryKeywords
            ? { discoveryKeywords: options.discoveryKeywords }
            : {}),
          ...(options?.webUrls ? { webUrls: options.webUrls } : {}),
          ...(ingestLimit ? { ingestLimit } : {}),
          ...(shouldStop ? { shouldStop } : {}),
          onProgress: async (event) => {
            const sourceResult = event.sourceResult;
            const progressType =
              event.type === "source_completed"
                ? "ingestion_source_completed"
                : event.type === "source_skipped"
                  ? "ingestion_source_skipped"
                  : "ingestion_source_failed";

            await onProgress?.({
              type: progressType,
              step: "ingest",
              ...(sourceResult.message
                ? { message: sourceResult.message }
                : {}),
              meta: sourceResult,
            });
          },
        }),
      onProgress,
      shouldStop,
    );
    const embedStep = await runTrackedStep(
      "embed",
      { subreddit, embedLimit: effectiveEmbedLimit ?? null },
      async () =>
        embedPendingSourceItems(
          effectiveEmbedLimit,
          async (event: EmbeddingProgressEvent) => {
            if (event.stage === "started") {
              await onProgress?.({
                type: "embedding_started",
                step: "embed",
                meta: {
                  total: event.total,
                },
              });
              return;
            }

            await onProgress?.({
              type: "embedding_progress",
              step: "embed",
              meta: {
                total: event.total,
                completed: event.completed,
                sourceItemId: event.sourceItemId,
              },
            });
          },
          shouldStop,
        ),
      onProgress,
      shouldStop,
    );
    const extractStep = await runTrackedStep(
      "extract",
      { subreddit, extractLimit: extractLimit ?? null },
      async () =>
        extractPendingSourceItems(
          extractLimit,
          async (event: ExtractionProgressEvent) => {
            if (event.stage === "started") {
              await onProgress?.({
                type: "extraction_started",
                step: "extract",
                meta: {
                  total: event.total,
                },
              });
              return;
            }

            await onProgress?.({
              type: "extraction_progress",
              step: "extract",
              ...(event.errorMessage ? { message: event.errorMessage } : {}),
              meta: {
                total: event.total,
                completed: event.completed,
                successCount: event.successCount,
                failureCount: event.failureCount,
                sourceItemId: event.sourceItemId,
                stage: event.stage,
              },
            });
          },
          shouldStop,
        ),
      onProgress,
      shouldStop,
    );
    const scoreStep = await runTrackedStep(
      "score",
      {
        subreddit,
        ingestLimit: ingestLimit ?? null,
        embedLimit: effectiveEmbedLimit ?? null,
        extractLimit: extractLimit ?? null,
      },
      async () => materializeOpportunities(),
      onProgress,
      shouldStop,
    );

    return {
      subreddit,
      steps: [ingestStep, embedStep, extractStep, scoreStep],
      startedAt,
      finishedAt: nowIso(),
    };
  });
}
