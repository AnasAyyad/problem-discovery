import { buildProblemClusters } from '../clustering/clustering.service.js';
import { buildClusterLabel } from '../clustering/clustering.service.js';
import { listLatestSuccessfulExtractions } from '../extraction/extraction.repository.js';
import { calculateOpportunityScores, deriveSignalsFromExtraction } from '../scoring/scoring.service.js';

import { countVisibleOpportunities } from './opportunity.repository.js';
import { ignoreOpportunity } from './opportunity.repository.js';
import { listPagedOpportunities } from './opportunity.repository.js';
import { listTopOpportunities } from './opportunity.repository.js';
import { upsertOpportunity } from './opportunity.repository.js';

export async function getOpportunities(limit?: number) {
  return listTopOpportunities(limit);
}

export async function getOpportunityPage(limit = 5, page = 1) {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const total = await countVisibleOpportunities();
  const items = await listPagedOpportunities(safeLimit, (safePage - 1) * safeLimit);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  };
}

export async function hideOpportunity(opportunityId: number): Promise<void> {
  await ignoreOpportunity(opportunityId);
}

export async function materializeOpportunities(): Promise<{ processedCount: number; clusterCount: number; }> {
  const clusters = await buildProblemClusters();
  const extractions = await listLatestSuccessfulExtractions();
  const clusterByLabel = new Map(clusters.map((cluster) => [cluster.label, cluster]));
  let processedCount = 0;

  for (const extraction of extractions) {
    const label = buildClusterLabel(extraction.extracted.problem, extraction.extracted.target_customer);
    const cluster = clusterByLabel.get(label);

    if (!cluster) {
      continue;
    }

    const signals = deriveSignalsFromExtraction(extraction.extracted, {
      evidenceCount: cluster.evidenceCount,
      sourceDiversity: cluster.sourceDiversity,
      latestEvidenceAt: cluster.latestEvidenceAt
    });
    const scores = await calculateOpportunityScores(signals);

    await upsertOpportunity({
      clusterId: cluster.id,
      problem: extraction.extracted.problem,
      targetCustomer: extraction.extracted.target_customer,
      painDescription: extraction.extracted.pain_description,
      currentWorkaround: extraction.extracted.current_workaround,
      businessImpact: extraction.extracted.business_impact,
      potentialSolution: extraction.extracted.potential_solution,
      estimatedPricing: extraction.extracted.estimated_pricing,
      mvpScope: extraction.extracted.mvp_scope,
      opportunityScore: scores.opportunityScore,
      confidenceScore: scores.confidenceScore,
      scoringBreakdown: {
        signals,
        modelConfidenceScore: extraction.confidenceScore
      }
    });

    processedCount += 1;
  }

  return {
    processedCount,
    clusterCount: clusters.length
  };
}
