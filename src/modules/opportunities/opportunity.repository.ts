import { pool } from '../../db/pool.js';

import type { OpportunityRecord } from './opportunity.types.js';

interface OpportunityListRow {
  id: number;
  cluster_id: number;
  problem: string;
  target_customer: string;
  pain_description: string;
  current_workaround: string | null;
  business_impact: string;
  potential_solution: string;
  estimated_pricing: string | null;
  mvp_scope: string;
  opportunity_score: string;
  confidence_score: string;
  scoring_breakdown: unknown;
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

interface OpportunityUpsertInput {
  clusterId: number;
  problem: string;
  targetCustomer: string;
  painDescription: string;
  currentWorkaround: string;
  businessImpact: string;
  potentialSolution: string;
  estimatedPricing: string;
  mvpScope: string;
  opportunityScore: number;
  confidenceScore: number;
  scoringBreakdown: unknown;
}

function toListItem(row: OpportunityListRow): OpportunityRecord {
  return {
    id: row.id,
    clusterId: row.cluster_id,
    problem: row.problem,
    targetCustomer: row.target_customer,
    painDescription: row.pain_description,
    currentWorkaround: row.current_workaround ?? '',
    businessImpact: row.business_impact,
    potentialSolution: row.potential_solution,
    estimatedPricing: row.estimated_pricing ?? '',
    mvpScope: row.mvp_scope,
    opportunityScore: Number(row.opportunity_score),
    confidenceScore: Number(row.confidence_score),
    scoringBreakdown: row.scoring_breakdown,
    evidenceCount: row.evidence_count,
    sourceDiversity: row.source_diversity,
    latestEvidenceAt: row.latest_evidence_at?.toISOString() ?? null,
    evidenceItems: row.evidence_items ?? []
  };
}

export async function upsertOpportunity(input: OpportunityUpsertInput): Promise<void> {
  await pool.query(
    `
      INSERT INTO opportunities (
        cluster_id,
        problem,
        target_customer,
        pain_description,
        current_workaround,
        business_impact,
        potential_solution,
        estimated_pricing,
        mvp_scope,
        opportunity_score,
        confidence_score,
        scoring_breakdown
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (cluster_id) DO UPDATE
      SET
        problem = EXCLUDED.problem,
        target_customer = EXCLUDED.target_customer,
        pain_description = EXCLUDED.pain_description,
        current_workaround = EXCLUDED.current_workaround,
        business_impact = EXCLUDED.business_impact,
        potential_solution = EXCLUDED.potential_solution,
        estimated_pricing = EXCLUDED.estimated_pricing,
        mvp_scope = EXCLUDED.mvp_scope,
        opportunity_score = EXCLUDED.opportunity_score,
        confidence_score = EXCLUDED.confidence_score,
        scoring_breakdown = EXCLUDED.scoring_breakdown
    `,
    [
      input.clusterId,
      input.problem,
      input.targetCustomer,
      input.painDescription,
      input.currentWorkaround,
      input.businessImpact,
      input.potentialSolution,
      input.estimatedPricing,
      input.mvpScope,
      input.opportunityScore,
      input.confidenceScore,
      JSON.stringify(input.scoringBreakdown)
    ]
  );
}

export async function listTopOpportunities(limit = 25): Promise<OpportunityRecord[]> {
  const result = await pool.query<OpportunityListRow>(
    `
      SELECT
        o.id,
        o.cluster_id,
        o.problem,
        o.target_customer,
        o.pain_description,
        o.current_workaround,
        o.business_impact,
        o.potential_solution,
        o.estimated_pricing,
        o.mvp_scope,
        o.opportunity_score,
        o.confidence_score,
        o.scoring_breakdown,
        pc.evidence_count,
        COALESCE(stats.source_diversity, 0)::INT AS source_diversity,
        stats.latest_evidence_at,
        COALESCE(evidence_items.items, '[]'::JSONB) AS evidence_items
      FROM opportunities o
      INNER JOIN problem_clusters pc
        ON pc.id = o.cluster_id
      LEFT JOIN (
        SELECT
          pci.cluster_id,
          COUNT(DISTINCT si.source)::INT AS source_diversity,
          MAX(si.created_at) AS latest_evidence_at
        FROM problem_cluster_items pci
        INNER JOIN source_items si
          ON si.id = pci.source_item_id
        GROUP BY pci.cluster_id
      ) stats
        ON stats.cluster_id = o.cluster_id
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
        ON evidence_items.cluster_id = o.cluster_id
      ORDER BY o.opportunity_score DESC, o.confidence_score DESC, o.inserted_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(toListItem);
}
