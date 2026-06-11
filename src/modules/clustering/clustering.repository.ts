import { pool } from '../../db/pool.js';

import type { ClusterSummary } from './clustering.types.js';

interface ClusterRow {
  id: number;
  label: string;
  evidence_count: number;
  source_diversity: number;
  latest_evidence_at: Date | null;
  evidence_items: Array<{
    sourceItemId: number;
    source: string;
    sourceUrl: string;
    title: string | null;
    createdAt: string | null;
  }>;
}

function mapClusterRow(row: ClusterRow): ClusterSummary {
  return {
    id: row.id,
    label: row.label,
    evidenceCount: row.evidence_count,
    sourceDiversity: row.source_diversity,
    latestEvidenceAt: row.latest_evidence_at?.toISOString() ?? null,
    evidenceItems: row.evidence_items ?? []
  };
}

function buildClusterSummaryQuery(): string {
  return `
    SELECT
      pc.id,
      pc.label,
      pc.evidence_count,
      COALESCE(stats.source_diversity, 0)::INT AS source_diversity,
      stats.latest_evidence_at,
      COALESCE(evidence_items.items, '[]'::JSONB) AS evidence_items
    FROM problem_clusters pc
    LEFT JOIN (
      SELECT
        pci.cluster_id,
        COUNT(*)::INT AS evidence_count,
        COUNT(DISTINCT si.source)::INT AS source_diversity,
        MAX(si.created_at) AS latest_evidence_at
      FROM problem_cluster_items pci
      INNER JOIN source_items si
        ON si.id = pci.source_item_id
      GROUP BY pci.cluster_id
    ) stats
      ON stats.cluster_id = pc.id
    LEFT JOIN (
      SELECT
        ranked.cluster_id,
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'sourceItemId', ranked.source_item_id,
            'source', ranked.source,
            'sourceUrl', ranked.source_url,
            'title', ranked.title,
            'createdAt', ranked.created_at
          )
          ORDER BY ranked.created_at DESC NULLS LAST, ranked.source_item_id DESC
        ) AS items
      FROM (
        SELECT
          pci.cluster_id,
          si.id AS source_item_id,
          si.source,
          si.source_url,
          si.title,
          si.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY pci.cluster_id
            ORDER BY si.created_at DESC NULLS LAST, si.id DESC
          ) AS rn
        FROM problem_cluster_items pci
        INNER JOIN source_items si
          ON si.id = pci.source_item_id
      ) ranked
      WHERE ranked.rn <= 5
      GROUP BY ranked.cluster_id
    ) evidence_items
      ON evidence_items.cluster_id = pc.id
  `;
}

export async function upsertProblemCluster(label: string, summary: string): Promise<ClusterSummary> {
  const result = await pool.query<ClusterRow>(
    `
      INSERT INTO problem_clusters (label, summary)
      VALUES ($1, $2)
      ON CONFLICT (label) DO UPDATE
      SET summary = EXCLUDED.summary
      RETURNING id, label, evidence_count, 0::INT AS source_diversity, NULL::TIMESTAMPTZ AS latest_evidence_at, '[]'::JSONB AS evidence_items
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
      RETURNING pc.id
    `,
    [clusterId]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to refresh cluster evidence count');
  }

  return getProblemClusterSummary(row.id);
}

export async function getProblemClusterSummary(clusterId: number): Promise<ClusterSummary> {
  const result = await pool.query<ClusterRow>(
    `
      ${buildClusterSummaryQuery()}
      WHERE pc.id = $1
    `,
    [clusterId]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to load problem cluster summary');
  }

  return mapClusterRow(row);
}
