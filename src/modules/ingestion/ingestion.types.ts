import type { SourceItemInput } from '../source-items/source-item.schema.js';

export interface IngestionResult {
  source: string;
  fetchedCount: number;
  persistedCount: number;
  items: SourceItemInput[];
}

export interface IngestionSourceResult {
  source: string;
  status: 'completed' | 'skipped' | 'failed';
  fetchedCount: number;
  persistedCount: number;
  message?: string;
}
