import type { IngestionCheckpoint, SignalEventInput } from '../ingestion.registry.js';

export async function ingestGoogleTrendsSignals(params?: {
  checkpoint?: IngestionCheckpoint | null;
}): Promise<{
  source: string;
  fetchedCount: number;
  persistedCount: number;
  signals: SignalEventInput[];
  checkpoint: IngestionCheckpoint | null;
}> {
  return {
    source: 'googletrends',
    fetchedCount: 0,
    persistedCount: 0,
    signals: [],
    checkpoint: params?.checkpoint ?? null
  };
}
