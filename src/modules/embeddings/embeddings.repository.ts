import { pool } from '../../db/pool.js';

function formatVector(values: number[]): string {
  return `[${values.map((value) => Number(value.toFixed(8))).join(',')}]`;
}

export async function upsertSourceItemEmbedding(
  sourceItemId: number,
  modelName: string,
  embedding: number[]
): Promise<void> {
  if (embedding.length === 0) {
    throw new Error('Embedding vector is empty');
  }

  await pool.query(
    `
      INSERT INTO source_item_embeddings (source_item_id, model_name, embedding)
      VALUES ($1, $2, $3::vector)
      ON CONFLICT (source_item_id, model_name) DO UPDATE
      SET embedding = EXCLUDED.embedding
    `,
    [sourceItemId, modelName, formatVector(embedding)]
  );
}