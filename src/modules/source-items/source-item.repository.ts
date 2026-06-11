import { pool } from '../../db/pool.js';
import { hashText } from '../../lib/hash.js';

import type { PersistedSourceItem } from './source-item.types.js';
import type { SourceItemInput } from './source-item.schema.js';

interface SourceItemRow {
  id: number;
  source: string;
  external_id: string;
  source_url: string;
  title: string | null;
  body: string;
  author_name: string | null;
  created_at: Date | null;
  normalized_text: string;
  content_hash: string;
  inserted_at: Date;
}

export interface SourceItemTextRow {
  id: number;
  source: string;
  source_url: string;
  title: string | null;
  body: string;
  normalized_text: string;
}

function mapRow(row: SourceItemRow): PersistedSourceItem {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    sourceUrl: row.source_url,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at?.toISOString() ?? null,
    normalizedText: row.normalized_text,
    contentHash: row.content_hash,
    rawPayload: null,
    insertedAt: row.inserted_at.toISOString()
  };
}

export async function insertSourceItem(input: SourceItemInput): Promise<PersistedSourceItem> {
  const contentHash = hashText(`${input.source}:${input.normalizedText}`);
  const result = await pool.query<SourceItemRow>(
    `
      INSERT INTO source_items (
        source,
        external_id,
        source_url,
        title,
        body,
        author_name,
        created_at,
        normalized_text,
        content_hash,
        raw_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (source, external_id) DO UPDATE
      SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        author_name = EXCLUDED.author_name,
        created_at = EXCLUDED.created_at,
        normalized_text = EXCLUDED.normalized_text,
        raw_payload = EXCLUDED.raw_payload
      RETURNING id, source, external_id, source_url, title, body, author_name, created_at, normalized_text, content_hash, inserted_at
    `,
    [
      input.source,
      input.externalId,
      input.sourceUrl,
      input.title,
      input.body,
      input.authorName,
      input.createdAt,
      input.normalizedText,
      contentHash,
      JSON.stringify(input.rawPayload)
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to persist source item');
  }

  return mapRow(row);
}

export async function listRecentSourceItems(limit = 20): Promise<PersistedSourceItem[]> {
  const result = await pool.query<SourceItemRow>(
    `
      SELECT id, source, external_id, source_url, title, body, author_name, created_at, normalized_text, content_hash, inserted_at
      FROM source_items
      ORDER BY inserted_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(mapRow);
}

export async function listPendingEmbeddingSourceItems(modelName: string, limit = 25): Promise<SourceItemTextRow[]> {
  const result = await pool.query<SourceItemTextRow>(
    `
      SELECT si.id, si.source, si.source_url, si.title, si.body, si.normalized_text
      FROM source_items si
      LEFT JOIN source_item_embeddings sie
        ON sie.source_item_id = si.id
       AND sie.model_name = $1
      WHERE sie.id IS NULL
      ORDER BY si.inserted_at ASC
      LIMIT $2
    `,
    [modelName, limit]
  );

  return result.rows;
}

export async function listPendingExtractionSourceItems(
  modelName: string,
  promptVersion: string,
  limit = 25
): Promise<SourceItemTextRow[]> {
  const result = await pool.query<SourceItemTextRow>(
    `
      SELECT si.id, si.source, si.source_url, si.title, si.body, si.normalized_text
      FROM source_items si
      LEFT JOIN evidence_extractions ee
        ON ee.source_item_id = si.id
       AND ee.model_name = $1
       AND ee.prompt_version = $2
       AND ee.parse_success = TRUE
      WHERE ee.id IS NULL
      ORDER BY si.inserted_at ASC
      LIMIT $3
    `,
    [modelName, promptVersion, limit]
  );

  return result.rows;
}