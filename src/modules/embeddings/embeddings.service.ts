import { createEmbedding } from './embeddings.client.js';

import { env } from '../../config/env.js';
import { listPendingEmbeddingSourceItems } from '../source-items/source-item.repository.js';

import { upsertSourceItemEmbedding } from './embeddings.repository.js';

export async function embedText(text: string): Promise<number[]> {
  return createEmbedding(text);
}

export async function embedPendingSourceItems(
  limit = 25,
  onProgress?: (event: {
    stage: 'started' | 'item_completed';
    total: number;
    completed: number;
    sourceItemId?: number;
  }) => void
): Promise<{ processedCount: number; itemIds: number[]; }> {
  const items = await listPendingEmbeddingSourceItems(env.OLLAMA_EMBED_MODEL, limit);
  const itemIds: number[] = [];
  onProgress?.({
    stage: 'started',
    total: items.length,
    completed: 0
  });

  for (const item of items) {
    const embedding = await embedText(item.normalized_text);
    await upsertSourceItemEmbedding(item.id, env.OLLAMA_EMBED_MODEL, embedding);
    itemIds.push(item.id);
    onProgress?.({
      stage: 'item_completed',
      total: items.length,
      completed: itemIds.length,
      sourceItemId: item.id
    });
  }

  return {
    processedCount: itemIds.length,
    itemIds
  };
}
