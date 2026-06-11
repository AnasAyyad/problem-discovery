import { pool } from '../../db/pool.js';

import type { ExtractionResult } from './extraction.schema.js';

interface ExtractionRow {
  source_item_id: number;
  extracted_json: ExtractionResult;
  confidence_score: string;
}

interface ExtractionWithEmbeddingRow extends ExtractionRow {
  embedding: string | null;
  matched_query: string | null;
}

export interface LatestExtractionRecord {
  sourceItemId: number;
  extracted: ExtractionResult;
  confidenceScore: number;
  matchedQuery?: string | null;
  embedding?: number[] | null;
}

function parseVector(value: string | null): number[] | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null;
  }

  return trimmed
    .slice(1, -1)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

export async function insertEvidenceExtraction(params: {
  sourceItemId: number;
  modelName: string;
  promptVersion: string;
  extractedJson: unknown;
  confidenceScore: number;
  parseSuccess: boolean;
}): Promise<void> {
  await pool.query(
    `
      INSERT INTO evidence_extractions (
        source_item_id,
        model_name,
        prompt_version,
        extracted_json,
        confidence_score,
        parse_success
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      params.sourceItemId,
      params.modelName,
      params.promptVersion,
      JSON.stringify(params.extractedJson),
      params.confidenceScore,
      params.parseSuccess
    ]
  );
}

export async function listLatestSuccessfulExtractions(): Promise<LatestExtractionRecord[]> {
  const result = await pool.query<ExtractionRow>(
    `
      SELECT DISTINCT ON (ee.source_item_id)
        ee.source_item_id,
        ee.extracted_json,
        ee.confidence_score
      FROM evidence_extractions ee
      WHERE ee.parse_success = TRUE
      ORDER BY ee.source_item_id, ee.inserted_at DESC
    `
  );

  return result.rows.map((row) => ({
    sourceItemId: row.source_item_id,
    extracted: row.extracted_json,
    confidenceScore: Number(row.confidence_score)
  }));
}

export async function listLatestSuccessfulExtractionsWithEmbeddings(modelName: string): Promise<LatestExtractionRecord[]> {
  const result = await pool.query<ExtractionWithEmbeddingRow>(
    `
      SELECT DISTINCT ON (ee.source_item_id)
        ee.source_item_id,
        ee.extracted_json,
        ee.confidence_score,
        si.matched_query,
        sie.embedding::TEXT AS embedding
      FROM evidence_extractions ee
      INNER JOIN source_items si
        ON si.id = ee.source_item_id
      LEFT JOIN source_item_embeddings sie
        ON sie.source_item_id = ee.source_item_id
       AND sie.model_name = $1
      WHERE ee.parse_success = TRUE
      ORDER BY ee.source_item_id, ee.inserted_at DESC
    `,
    [modelName]
  );

  return result.rows.map((row) => ({
    sourceItemId: row.source_item_id,
    extracted: row.extracted_json,
    confidenceScore: Number(row.confidence_score),
    matchedQuery: row.matched_query,
    embedding: parseVector(row.embedding)
  }));
}
