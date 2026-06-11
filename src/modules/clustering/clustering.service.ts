import { listLatestSuccessfulExtractions } from '../extraction/extraction.repository.js';

import { attachSourceItemToCluster, refreshProblemClusterEvidenceCount, upsertProblemCluster } from './clustering.repository.js';
import type { ClusterSummary } from './clustering.types.js';

export async function buildProblemClusters(): Promise<ClusterSummary[]> {
  const extractions = await listLatestSuccessfulExtractions();
  const summaries = new Map<string, ClusterSummary>();

  for (const extraction of extractions) {
    const label = `${extraction.extracted.problem} :: ${extraction.extracted.target_customer}`;
    const cluster = await upsertProblemCluster(label, extraction.extracted.pain_description);
    await attachSourceItemToCluster(cluster.id, extraction.sourceItemId, 1);
    const refreshed = await refreshProblemClusterEvidenceCount(cluster.id);
    summaries.set(refreshed.label, refreshed);
  }

  return [...summaries.values()];
}