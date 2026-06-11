import { env } from '../../config/env.js';
import { listLatestSuccessfulExtractionsWithEmbeddings } from '../extraction/extraction.repository.js';

import {
  attachSourceItemToCluster,
  refreshProblemClusterEvidenceCount,
  resetProblemClusters,
  upsertProblemCluster
} from './clustering.repository.js';
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

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export async function buildProblemClusters(): Promise<ClusterSummary[]> {
  const extractions = await listLatestSuccessfulExtractionsWithEmbeddings(env.OLLAMA_EMBED_MODEL);
  await resetProblemClusters();
  const summaries = new Map<string, ClusterSummary>();
  const clusterRepresentatives = new Map<string, { embedding: number[] | null; normalizedTarget: string; }>();

  for (const extraction of extractions) {
    const fallbackLabel = buildClusterLabel(extraction.extracted.problem, extraction.extracted.target_customer);
    const normalizedTarget = normalizeClusterDimension(extraction.extracted.target_customer);
    let label = fallbackLabel;

    if (extraction.embedding) {
      let bestMatchLabel: string | null = null;
      let bestSimilarity = 0;

      for (const [candidateLabel, representative] of clusterRepresentatives.entries()) {
        if (!representative.embedding || representative.normalizedTarget !== normalizedTarget) {
          continue;
        }

        const similarity = cosineSimilarity(extraction.embedding, representative.embedding);

        if (similarity > env.CLUSTER_SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatchLabel = candidateLabel;
        }
      }

      if (bestMatchLabel) {
        label = bestMatchLabel;
      }
    }

    const cluster = await upsertProblemCluster(label, extraction.extracted.pain_description);
    await attachSourceItemToCluster(cluster.id, extraction.sourceItemId, 1);
    const refreshed = await refreshProblemClusterEvidenceCount(cluster.id);
    summaries.set(refreshed.label, refreshed);
    if (!clusterRepresentatives.has(label)) {
      clusterRepresentatives.set(label, {
        embedding: extraction.embedding ?? null,
        normalizedTarget
      });
    }
  }

  return [...summaries.values()];
}
