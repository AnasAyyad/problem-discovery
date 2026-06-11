export interface OpportunityRecord {
  id: number;
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
  evidenceCount: number;
  sourceDiversity: number;
  latestEvidenceAt: string | null;
  evidenceItems: Array<{
    sourceItemId: number;
    source: string;
    sourceUrl: string;
    title: string | null;
    createdAt: string | null;
  }>;
}
