import { pool } from '../../db/pool.js';

interface PipelineJobRow {
  id: number;
  status: string;
  config_json: unknown;
  progress_json: unknown;
  result_json: unknown;
  error_text: string | null;
  created_at: Date;
  started_at: Date;
  finished_at: Date | null;
}

export interface PipelineJobRecord {
  id: number;
  status: string;
  config: unknown;
  progress: unknown;
  result: unknown;
  errorText: string | null;
  createdAt: string;
  startedAt: string;
  finishedAt: string | null;
}

function mapJobRow(row: PipelineJobRow): PipelineJobRecord {
  return {
    id: row.id,
    status: row.status,
    config: row.config_json,
    progress: row.progress_json,
    result: row.result_json,
    errorText: row.error_text,
    createdAt: row.created_at.toISOString(),
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null
  };
}

export async function createPipelineJob(config: unknown, progress: unknown): Promise<PipelineJobRecord> {
  const result = await pool.query<PipelineJobRow>(
    `
      INSERT INTO pipeline_jobs (status, config_json, progress_json)
      VALUES ('running', $1, $2)
      RETURNING id, status, config_json, progress_json, result_json, error_text, created_at, started_at, finished_at
    `,
    [JSON.stringify(config), JSON.stringify(progress)]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to create pipeline job');
  }

  return mapJobRow(row);
}

export async function updatePipelineJobProgress(id: number, progress: unknown): Promise<void> {
  await pool.query(
    `
      UPDATE pipeline_jobs
      SET progress_json = $2
      WHERE id = $1
    `,
    [id, JSON.stringify(progress)]
  );
}

export async function completePipelineJob(id: number, progress: unknown, result: unknown): Promise<void> {
  await pool.query(
    `
      UPDATE pipeline_jobs
      SET status = 'completed',
          progress_json = $2,
          result_json = $3,
          finished_at = NOW()
      WHERE id = $1
    `,
    [id, JSON.stringify(progress), JSON.stringify(result)]
  );
}

export async function failPipelineJob(id: number, progress: unknown, errorText: string): Promise<void> {
  await pool.query(
    `
      UPDATE pipeline_jobs
      SET status = 'failed',
          progress_json = $2,
          error_text = $3,
          finished_at = NOW()
      WHERE id = $1
    `,
    [id, JSON.stringify(progress), errorText]
  );
}

export async function getPipelineJob(id: number): Promise<PipelineJobRecord | null> {
  const result = await pool.query<PipelineJobRow>(
    `
      SELECT id, status, config_json, progress_json, result_json, error_text, created_at, started_at, finished_at
      FROM pipeline_jobs
      WHERE id = $1
    `,
    [id]
  );

  const row = result.rows[0];
  return row ? mapJobRow(row) : null;
}
