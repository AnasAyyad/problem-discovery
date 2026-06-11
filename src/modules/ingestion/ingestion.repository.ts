import { pool } from '../../db/pool.js';

import type { IngestionCheckpoint, SignalEventInput } from './ingestion.registry.js';

interface CheckpointRow {
  checkpoint_json: IngestionCheckpoint;
}

export async function getSourceCheckpoint(source: string, checkpointKey: string): Promise<IngestionCheckpoint | null> {
  const result = await pool.query<CheckpointRow>(
    `
      SELECT checkpoint_json
      FROM source_checkpoints
      WHERE source = $1
        AND checkpoint_key = $2
    `,
    [source, checkpointKey]
  );

  return result.rows[0]?.checkpoint_json ?? null;
}

export async function upsertSourceCheckpoint(
  source: string,
  checkpointKey: string,
  checkpoint: IngestionCheckpoint | null | undefined
): Promise<void> {
  if (!checkpoint) {
    return;
  }

  await pool.query(
    `
      INSERT INTO source_checkpoints (source, checkpoint_key, checkpoint_json)
      VALUES ($1, $2, $3)
      ON CONFLICT (source, checkpoint_key) DO UPDATE
      SET checkpoint_json = EXCLUDED.checkpoint_json,
          updated_at = NOW()
    `,
    [source, checkpointKey, JSON.stringify(checkpoint)]
  );
}

export async function insertSignalEvents(signals: SignalEventInput[]): Promise<number> {
  let persistedCount = 0;

  for (const signal of signals) {
    const result = await pool.query<{ id: number }>(
      `
        INSERT INTO signal_events (
          source,
          signal_kind,
          external_id,
          matched_query,
          title,
          source_url,
          signal_value,
          created_at,
          raw_payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (source, external_id) DO UPDATE
        SET
          matched_query = EXCLUDED.matched_query,
          title = EXCLUDED.title,
          source_url = EXCLUDED.source_url,
          signal_value = EXCLUDED.signal_value,
          created_at = EXCLUDED.created_at,
          raw_payload = EXCLUDED.raw_payload
        RETURNING 1 AS id
      `,
      [
        signal.source,
        signal.signalKind,
        signal.externalId,
        signal.matchedQuery,
        signal.title,
        signal.sourceUrl,
        signal.signalValue,
        signal.createdAt,
        JSON.stringify(signal.rawPayload)
      ]
    );

    if (result.rows[0]) {
      persistedCount += 1;
    }
  }

  return persistedCount;
}

export async function getSignalStrengthByQueries(queries: string[]): Promise<number> {
  if (queries.length === 0) {
    return 0;
  }

  const result = await pool.query<{ signal_strength: string }>(
    `
      SELECT COALESCE(SUM(signal_value), 0)::TEXT AS signal_strength
      FROM signal_events
      WHERE matched_query = ANY($1)
    `,
    [queries]
  );

  return Number(result.rows[0]?.signal_strength ?? '0');
}
