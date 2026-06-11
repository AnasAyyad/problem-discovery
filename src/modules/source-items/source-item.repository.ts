import { pool } from '../../db/pool.js';
import { hashText } from '../../lib/hash.js';

import type { PersistedSourceItem } from './source-item.types.js';
import type { SourceItemInput } from './source-item.schema.js';

interface SourceItemRow {
  id: number;
  source: string;
  source_kind: 'complaint' | 'signal';
  external_id: string;
  source_url: string;
  title: string | null;
  body: string;
  author_name: string | null;
  created_at: Date | null;
  normalized_text: string;
  matched_query: string | null;
  source_context_json: Record<string, unknown>;
  content_hash: string;
  inserted_at: Date;
}

export interface SourceItemTextRow {
  id: number;
  source: string;
  sourceKind: 'complaint' | 'signal';
  source_url: string;
  title: string | null;
  body: string;
  normalized_text: string;
  created_at: Date | null;
  matched_query: string | null;
}

function mapRow(row: SourceItemRow): PersistedSourceItem {
  return {
    id: row.id,
    source: row.source,
    sourceKind: row.source_kind,
    externalId: row.external_id,
    sourceUrl: row.source_url,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at?.toISOString() ?? null,
    normalizedText: row.normalized_text,
    matchedQuery: row.matched_query,
    sourceContext: row.source_context_json ?? {},
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
        source_kind,
        external_id,
        source_url,
        title,
        body,
        author_name,
        created_at,
        normalized_text,
        matched_query,
        source_context_json,
        content_hash,
        raw_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (source, external_id) DO UPDATE
      SET
        source_kind = EXCLUDED.source_kind,
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        author_name = EXCLUDED.author_name,
        created_at = EXCLUDED.created_at,
        normalized_text = EXCLUDED.normalized_text,
        matched_query = EXCLUDED.matched_query,
        source_context_json = EXCLUDED.source_context_json,
        content_hash = EXCLUDED.content_hash,
        raw_payload = EXCLUDED.raw_payload
      RETURNING id, source, source_kind, external_id, source_url, title, body, author_name, created_at, normalized_text, matched_query, source_context_json, content_hash, inserted_at
    `,
    [
      input.source,
      input.sourceKind,
      input.externalId,
      input.sourceUrl,
      input.title,
      input.body,
      input.authorName,
      input.createdAt,
      input.normalizedText,
      input.matchedQuery,
      JSON.stringify(input.sourceContext),
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
      SELECT id, source, source_kind, external_id, source_url, title, body, author_name, created_at, normalized_text, matched_query, source_context_json, content_hash, inserted_at
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
           , si.source_kind AS "sourceKind", si.created_at, si.matched_query
      FROM source_items si
      LEFT JOIN source_item_embeddings sie
        ON sie.source_item_id = si.id
       AND sie.model_name = $1
      WHERE si.source_kind = 'complaint'
        AND sie.id IS NULL
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
  maxAttempts: number,
  limit = 25
): Promise<SourceItemTextRow[]> {
  const result = await pool.query<SourceItemTextRow>(
    `
      SELECT si.id, si.source, si.source_kind AS "sourceKind", si.source_url, si.title, si.body, si.normalized_text, si.created_at, si.matched_query
      FROM source_items si
      LEFT JOIN (
        SELECT
          source_item_id,
          COUNT(*)::INT AS attempt_count,
          BOOL_OR(parse_success) AS has_success
        FROM evidence_extractions
        WHERE model_name = $1
          AND prompt_version = $2
        GROUP BY source_item_id
      ) ee
        ON ee.source_item_id = si.id
      WHERE si.source_kind = 'complaint'
        AND COALESCE(ee.has_success, FALSE) = FALSE
        AND COALESCE(ee.attempt_count, 0) < $3
      ORDER BY si.inserted_at ASC
      LIMIT $4
    `,
    [modelName, promptVersion, maxAttempts, limit]
  );

  return result.rows;
}
