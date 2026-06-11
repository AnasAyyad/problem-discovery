import { createEmbedding } from "./embeddings.client.js";

import { env } from "../../config/env.js";
import {
  createPipelineStopError,
  createStopMonitor,
  isPipelineStopError,
} from "../../lib/pipeline-stop.js";
import { listPendingEmbeddingSourceItems } from "../source-items/source-item.repository.js";

import { upsertSourceItemEmbedding } from "./embeddings.repository.js";

export async function embedText(text: string): Promise<number[]> {
  return createEmbedding(text);
}

export async function embedPendingSourceItems(
  limit = 25,
  onProgress?: (event: {
    stage: "started" | "item_completed";
    total: number;
    completed: number;
    sourceItemId?: number;
  }) => void | Promise<void>,
  shouldStop?: () => Promise<boolean>,
): Promise<{ processedCount: number; itemIds: number[] }> {
  const items = await listPendingEmbeddingSourceItems(
    env.OLLAMA_EMBED_MODEL,
    limit,
  );
  const itemIds: number[] = [];
  await onProgress?.({
    stage: "started",
    total: items.length,
    completed: 0,
  });

  for (const item of items) {
    if (shouldStop && (await shouldStop())) {
      throw createPipelineStopError();
    }

    const abortController = new AbortController();
    const stopMonitoring = createStopMonitor(shouldStop, abortController);

    try {
      const embedding = await createEmbedding(
        item.normalized_text,
        abortController.signal,
      );
      await upsertSourceItemEmbedding(
        item.id,
        env.OLLAMA_EMBED_MODEL,
        embedding,
      );
      itemIds.push(item.id);
      await onProgress?.({
        stage: "item_completed",
        total: items.length,
        completed: itemIds.length,
        sourceItemId: item.id,
      });
    } catch (error: unknown) {
      if (
        isPipelineStopError(error) ||
        (abortController.signal.aborted && shouldStop && (await shouldStop()))
      ) {
        throw createPipelineStopError();
      }

      throw error;
    } finally {
      stopMonitoring();
    }
  }

  return {
    processedCount: itemIds.length,
    itemIds,
  };
}
