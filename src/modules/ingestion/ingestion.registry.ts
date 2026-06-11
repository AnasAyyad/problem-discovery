import type { SourceItemInput } from '../source-items/source-item.schema.js';

export interface IngestionCheckpoint {
  cursor?: string | null;
  unixTimestamp?: number | null;
  isoTimestamp?: string | null;
  page?: number | null;
}

export interface SignalEventInput {
  source: string;
  signalKind: string;
  externalId: string;
  matchedQuery: string | null;
  title: string | null;
  sourceUrl: string | null;
  signalValue: number | null;
  createdAt: string | null;
  rawPayload: unknown;
}

export interface ComplaintFetchResult {
  items: SourceItemInput[];
  checkpoint?: IngestionCheckpoint | null;
}

export interface SignalFetchResult {
  signals: SignalEventInput[];
  checkpoint?: IngestionCheckpoint | null;
}

export interface SourceFetchContext {
  discoveryKeywords: string[];
  webUrls: string[];
  ingestLimit?: number;
  subreddit: string;
  checkpoint?: IngestionCheckpoint | null;
}

export interface IngestionSourceDefinition {
  id: string;
  kind: 'complaint' | 'signal';
  checkpointKey: (context: SourceFetchContext) => string;
  isEnabled: (context: SourceFetchContext) => boolean;
  disabledReason?: (context: SourceFetchContext) => string;
  fetchBatch: (context: SourceFetchContext) => Promise<ComplaintFetchResult | SignalFetchResult>;
}
