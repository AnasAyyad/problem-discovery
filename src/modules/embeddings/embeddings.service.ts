import { createEmbedding } from './embeddings.client.js';

import { env } from '../../config/env.js';
import { listPendingEmbeddingSourceItems } from '../source-items/source-item.repository.js';

import { upsertSourceItemEmbedding } from './embeddings.repository.js';

export async function embedText(text: string): Promise<number[]> {
  return createEmbedding(text);
}

export async function embedPendingSourceItems(limit = 25): Promise<{ processedCount: number; itemIds: number[]; }> {
  const items = await listPendingEmbeddingSourceItems(env.OLLAMA_EMBED_MODEL, limit);
  const itemIds: number[] = [];

  for (const item of items) {
    const embedding = await embedText(item.normalized_text);
    await upsertSourceItemEmbedding(item.id, env.OLLAMA_EMBED_MODEL, embedding);
    itemIds.push(item.id);
  }

  return {
    processedCount: itemIds.length,
    itemIds
  };
}