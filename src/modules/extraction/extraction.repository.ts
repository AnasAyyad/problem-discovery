import { pool } from '../../db/pool.js';

import type { ExtractionResult } from './extraction.schema.js';

interface ExtractionRow {
  source_item_id: number;
  extracted_json: ExtractionResult;
  confidence_score: string;
}

export interface LatestExtractionRecord {
  sourceItemId: number;
  extracted: ExtractionResult;
  confidenceScore: number;
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