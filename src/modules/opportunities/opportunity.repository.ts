import { pool } from '../../db/pool.js';

interface OpportunityListRow {
  id: number;
  problem: string;
  target_customer: string;
  opportunity_score: string;
  confidence_score: string;
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

function toListItem(row: OpportunityListRow) {
  return {
    id: row.id,
    problem: row.problem,
    targetCustomer: row.target_customer,
    opportunityScore: Number(row.opportunity_score),
    confidenceScore: Number(row.confidence_score)
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

export async function listTopOpportunities(limit = 25): Promise<Array<{
  id: number;
  problem: string;
  targetCustomer: string;
  opportunityScore: number;
  confidenceScore: number;
}>> {
  const result = await pool.query<OpportunityListRow>(
    `
      SELECT id, problem, target_customer, opportunity_score, confidence_score
      FROM opportunities
      ORDER BY opportunity_score DESC, confidence_score DESC, inserted_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(toListItem);
}