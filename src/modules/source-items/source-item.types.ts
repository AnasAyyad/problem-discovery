export interface SourceItem {
  source: string;
  externalId: string;
  sourceUrl: string;
  title: string | null;
  body: string;
  authorName: string | null;
  createdAt: string | null;
  normalizedText: string;
  rawPayload: unknown;
}

export interface PersistedSourceItem extends SourceItem {
  id: number;
  contentHash: string;
  insertedAt: string;
}