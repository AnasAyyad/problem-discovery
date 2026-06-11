import { listLatestSuccessfulExtractions } from '../extraction/extraction.repository.js';

import { attachSourceItemToCluster, refreshProblemClusterEvidenceCount, upsertProblemCluster } from './clustering.repository.js';
import type { ClusterSummary } from './clustering.types.js';

function normalizeClusterDimension(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildClusterLabel(problem: string, targetCustomer: string): string {
  return `${normalizeClusterDimension(problem)} :: ${normalizeClusterDimension(targetCustomer)}`;
}

export async function buildProblemClusters(): Promise<ClusterSummary[]> {
  const extractions = await listLatestSuccessfulExtractions();
  const summaries = new Map<string, ClusterSummary>();

  for (const extraction of extractions) {
    const label = buildClusterLabel(extraction.extracted.problem, extraction.extracted.target_customer);
    const cluster = await upsertProblemCluster(label, extraction.extracted.pain_description);
    await attachSourceItemToCluster(cluster.id, extraction.sourceItemId, 1);
    const refreshed = await refreshProblemClusterEvidenceCount(cluster.id);
    summaries.set(refreshed.label, refreshed);
  }

  return [...summaries.values()];
}
