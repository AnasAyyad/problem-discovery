import type { OpportunityScores, OpportunitySignals } from './scoring.types.js';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

export function scoreOpportunity(signals: OpportunitySignals): OpportunityScores {
  const opportunityScore = clampScore(
    signals.painLevel * 2.5 +
      signals.frequency * 2 +
      signals.businessImpact * 2 +
      signals.abilityToPay * 1.5 +
      signals.reachability * 1 -
      signals.competitionPressure * 0.5 -
      signals.mvpDifficulty * 0.5 +
      signals.signalStrength * 1
  );

  const confidenceScore = clampScore(
    signals.evidenceVolume * 3.5 +
      signals.sourceDiversity * 2.5 +
      signals.extractionConfidence * 2 +
      signals.recency * 2
  );

  return {
    opportunityScore,
    confidenceScore
  };
}
