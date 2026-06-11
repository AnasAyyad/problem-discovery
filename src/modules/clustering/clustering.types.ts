export interface ClusterCandidate {
  sourceItemId: number;
  similarityScore: number;
}

export interface ClusterSummary {
  id: number;
  label: string;
  evidenceCount: number;
}