import { insertSourceItem } from '../source-items/source-item.repository.js';
import type { SourceItemInput } from '../source-items/source-item.schema.js';

import type { IngestionResult } from './ingestion.types.js';

export async function persistIngestedItems(source: string, items: SourceItemInput[]): Promise<IngestionResult> {
  const persisted = [];

  for (const item of items) {
    persisted.push(await insertSourceItem(item));
  }

  return {
    source,
    fetchedCount: items.length,
    persistedCount: persisted.length,
    items
  };
}