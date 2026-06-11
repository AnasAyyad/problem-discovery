import type { ExtractionResult } from '../extraction/extraction.schema.js';

import { scoreOpportunity } from './scoring.rules.js';
import type { OpportunityScores, OpportunitySignals } from './scoring.types.js';

export async function calculateOpportunityScores(signals: OpportunitySignals): Promise<OpportunityScores> {
  return scoreOpportunity(signals);
}

function containsAny(value: string, keywords: string[]): boolean {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

export function deriveSignalsFromExtraction(extraction: ExtractionResult, evidenceCount: number): OpportunitySignals {
  const painText = [
    extraction.pain_description,
    extraction.business_impact,
    extraction.current_workaround
  ].join(' ');
  const targetText = extraction.target_customer.toLowerCase();
  const solutionText = extraction.potential_solution.toLowerCase();

  const painLevel = containsAny(painText, ['manual', 'hours', 'terrible', 'nightmare', 'struggle', 'delay', 'error']) ? 8 : 5;
  const businessImpact = containsAny(painText, ['revenue', 'cost', 'compliance', 'audit', 'delay', 'errors', 'lost']) ? 8 : 5;
  const abilityToPay = containsAny(targetText, ['procurement', 'supply chain', 'inventory', 'accounting', 'healthcare', 'construction', 'operations', 'real estate']) ? 8 : 6;
  const reachability = containsAny(targetText, ['small business', 'smb', 'team', 'operations', 'manager']) ? 8 : 6;
  const competitionPressure = Math.min(10, Math.max(2, extraction.competition.length * 2));
  const mvpDifficulty = containsAny(solutionText, ['erp', 'integration', 'compliance', 'workflow engine']) ? 7 : 4;

  return {
    painLevel,
    frequency: Math.min(10, Math.max(3, evidenceCount * 2)),
    businessImpact,
    abilityToPay,
    reachability,
    competitionPressure,
    mvpDifficulty,
    evidenceVolume: Math.min(10, Math.max(2, evidenceCount * 2)),
    sourceDiversity: 3,
    extractionConfidence: Math.min(10, Math.max(1, extraction.confidence_score / 10)),
    recency: 7
  };
}