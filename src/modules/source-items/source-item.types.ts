export interface SourceItem {
  source: string;
  sourceKind: 'complaint' | 'signal';
  externalId: string;
  sourceUrl: string;
  title: string | null;
  body: string;
  authorName: string | null;
  createdAt: string | null;
  normalizedText: string;
  matchedQuery: string | null;
  sourceContext: Record<string, unknown>;
  rawPayload: unknown;
}

export interface PersistedSourceItem extends SourceItem {
  id: number;
  contentHash: string;
  insertedAt: string;
}
