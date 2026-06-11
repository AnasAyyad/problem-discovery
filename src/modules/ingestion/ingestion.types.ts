import type { SourceItemInput } from '../source-items/source-item.schema.js';

export interface IngestionResult {
  source: string;
  fetchedCount: number;
  persistedCount: number;
  items: SourceItemInput[];
}