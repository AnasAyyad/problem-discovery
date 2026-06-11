export interface ClusterCandidate {
  sourceItemId: number;
  similarityScore: number;
}

export interface ClusterEvidenceItem {
  sourceItemId: number;
  source: string;
  sourceUrl: string;
  title: string | null;
  createdAt: string | null;
}

export interface ClusterSummary {
  id: number;
  label: string;
  evidenceCount: number;
  sourceDiversity: number;
  signalStrength: number;
  matchedQueries: string[];
  latestEvidenceAt: string | null;
  evidenceItems: ClusterEvidenceItem[];
}
