export interface OpportunitySignals {
  painLevel: number;
  frequency: number;
  businessImpact: number;
  abilityToPay: number;
  reachability: number;
  competitionPressure: number;
  mvpDifficulty: number;
  evidenceVolume: number;
  sourceDiversity: number;
  extractionConfidence: number;
  recency: number;
}

export interface OpportunityScores {
  opportunityScore: number;
  confidenceScore: number;
}

export interface OpportunityScoringContext {
  evidenceCount: number;
  sourceDiversity: number;
  latestEvidenceAt: string | null;
}
