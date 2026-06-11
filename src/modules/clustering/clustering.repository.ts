import { pool } from '../../db/pool.js';

import type { ClusterSummary } from './clustering.types.js';

interface ClusterRow {
  id: number;
  label: string;
  evidence_count: number;
}

function mapClusterRow(row: ClusterRow): ClusterSummary {
  return {
    id: row.id,
    label: row.label,
    evidenceCount: row.evidence_count
  };
}

export async function upsertProblemCluster(label: string, summary: string): Promise<ClusterSummary> {
  const result = await pool.query<ClusterRow>(
    `
      INSERT INTO problem_clusters (label, summary)
      VALUES ($1, $2)
      ON CONFLICT (label) DO UPDATE
      SET summary = EXCLUDED.summary
      RETURNING id, label, evidence_count
    `,
    [label, summary]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to upsert problem cluster');
  }

  return mapClusterRow(row);
}

export async function attachSourceItemToCluster(
  clusterId: number,
  sourceItemId: number,
  similarityScore: number
): Promise<void> {
  await pool.query(
    `
      INSERT INTO problem_cluster_items (cluster_id, source_item_id, similarity_score)
      VALUES ($1, $2, $3)
      ON CONFLICT (cluster_id, source_item_id) DO NOTHING
    `,
    [clusterId, sourceItemId, similarityScore]
  );
}

export async function refreshProblemClusterEvidenceCount(clusterId: number): Promise<ClusterSummary> {
  const result = await pool.query<ClusterRow>(
    `
      UPDATE problem_clusters pc
      SET evidence_count = counts.evidence_count
      FROM (
        SELECT cluster_id, COUNT(*)::INT AS evidence_count
        FROM problem_cluster_items
        WHERE cluster_id = $1
        GROUP BY cluster_id
      ) counts
      WHERE pc.id = counts.cluster_id
      RETURNING pc.id, pc.label, pc.evidence_count
    `,
    [clusterId]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to refresh cluster evidence count');
  }

  return mapClusterRow(row);
}