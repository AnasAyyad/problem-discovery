import { pool } from '../../db/pool.js';
import { env } from '../../config/env.js';

import type { OpportunityRecord } from './opportunity.types.js';

interface OpportunityListRow {
  id: number;
  cluster_id: number;
  ignored_at: Date | null;
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
  signal_strength: string;
  matched_queries: string[];
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
    ignoredAt: row.ignored_at?.toISOString() ?? null,
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
    signalStrength: Number(row.signal_strength),
    matchedQueries: row.matched_queries ?? [],
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
  return listPagedOpportunities(limit, 0);
}

export async function listPagedOpportunities(limit = 25, offset = 0): Promise<OpportunityRecord[]> {
  const result = await pool.query<OpportunityListRow>(
    `
      SELECT
        o.id,
        o.cluster_id,
        o.ignored_at,
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
        COALESCE(signal_stats.signal_strength, 0)::TEXT AS signal_strength,
        COALESCE(query_stats.matched_queries, ARRAY[]::TEXT[]) AS matched_queries,
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
          pci.cluster_id,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT si.matched_query), NULL) AS matched_queries
        FROM problem_cluster_items pci
        INNER JOIN source_items si
          ON si.id = pci.source_item_id
        GROUP BY pci.cluster_id
      ) query_stats
        ON query_stats.cluster_id = o.cluster_id
      LEFT JOIN (
        SELECT
          q.cluster_id,
          COALESCE(SUM(se.signal_value), 0) AS signal_strength
        FROM (
          SELECT
            pci.cluster_id,
            si.matched_query
          FROM problem_cluster_items pci
          INNER JOIN source_items si
            ON si.id = pci.source_item_id
          WHERE si.matched_query IS NOT NULL
          GROUP BY pci.cluster_id, si.matched_query
        ) q
        INNER JOIN signal_events se
          ON se.matched_query = q.matched_query
        GROUP BY q.cluster_id
      ) signal_stats
        ON signal_stats.cluster_id = o.cluster_id
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
      WHERE o.ignored_at IS NULL
        AND o.opportunity_score >= $3
        AND o.confidence_score >= $4
        AND pc.evidence_count >= $5
        AND COALESCE(stats.source_diversity, 0)::INT >= $6
      ORDER BY o.opportunity_score DESC, o.confidence_score DESC, o.inserted_at DESC
      LIMIT $1
      OFFSET $2
    `,
    [
      limit,
      offset,
      env.OPPORTUNITY_MIN_SCORE,
      env.OPPORTUNITY_MIN_CONFIDENCE,
      env.OPPORTUNITY_MIN_EVIDENCE_COUNT,
      env.OPPORTUNITY_MIN_SOURCE_DIVERSITY
    ]
  );

  return result.rows.map(toListItem);
}

export async function countVisibleOpportunities(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::TEXT AS count
      FROM opportunities
      INNER JOIN problem_clusters pc
        ON pc.id = opportunities.cluster_id
      LEFT JOIN (
        SELECT
          pci.cluster_id,
          COUNT(DISTINCT si.source)::INT AS source_diversity
        FROM problem_cluster_items pci
        INNER JOIN source_items si
          ON si.id = pci.source_item_id
        GROUP BY pci.cluster_id
      ) stats
        ON stats.cluster_id = opportunities.cluster_id
      WHERE opportunities.ignored_at IS NULL
        AND opportunities.opportunity_score >= $1
        AND opportunities.confidence_score >= $2
        AND pc.evidence_count >= $3
        AND COALESCE(stats.source_diversity, 0)::INT >= $4
    `
    ,
    [
      env.OPPORTUNITY_MIN_SCORE,
      env.OPPORTUNITY_MIN_CONFIDENCE,
      env.OPPORTUNITY_MIN_EVIDENCE_COUNT,
      env.OPPORTUNITY_MIN_SOURCE_DIVERSITY
    ]
  );

  return Number(result.rows[0]?.count ?? '0');
}

export async function ignoreOpportunity(opportunityId: number): Promise<void> {
  await pool.query(
    `
      UPDATE opportunities
      SET ignored_at = NOW()
      WHERE id = $1
    `,
    [opportunityId]
  );
}
