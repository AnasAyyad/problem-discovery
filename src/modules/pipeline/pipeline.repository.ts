import { pool } from '../../db/pool.js';

interface PipelineRunRow {
  id: number;
}

export async function startPipelineStep(stepName: string, metaJson: unknown): Promise<number> {
  const result = await pool.query<PipelineRunRow>(
    `
      INSERT INTO pipeline_runs (step_name, status, meta_json)
      VALUES ($1, 'running', $2)
      RETURNING id
    `,
    [stepName, JSON.stringify(metaJson)]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to start pipeline step');
  }

  return row.id;
}

export async function finishPipelineStep(
  id: number,
  status: 'completed' | 'failed',
  metaJson: unknown,
  errorText?: string
): Promise<void> {
  await pool.query(
    `
      UPDATE pipeline_runs
      SET status = $2,
          meta_json = $3,
          error_text = $4,
          finished_at = NOW()
      WHERE id = $1
    `,
    [id, status, JSON.stringify(metaJson), errorText ?? null]
  );
}