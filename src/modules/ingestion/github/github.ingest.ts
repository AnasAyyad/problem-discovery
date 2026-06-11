import { persistIngestedItems } from '../ingestion.service.js';
import { getDiscoveryKeywords } from '../ingestion.keywords.js';
import type { IngestionCheckpoint } from '../ingestion.registry.js';

import { searchGitHubIssues } from './github.client.js';
import { mapGitHubIssues } from './github.mapper.js';

export async function ingestGitHubIssues(params?: {
  discoveryKeywords?: string[];
  checkpoint?: IngestionCheckpoint | null;
  limit?: number;
}): Promise<{
  source: string;
  fetchedCount: number;
  persistedCount: number;
  queries: string[];
  checkpoint: IngestionCheckpoint | null;
}> {
  const queries = getDiscoveryKeywords(params?.discoveryKeywords);
  const limit = params?.limit ?? 25;
  const fromIso = params?.checkpoint?.isoTimestamp ?? null;
  const items = [];
  let latestIso = fromIso;

  for (const query of queries) {
    const searchQuery = fromIso ? `${query} created:>${fromIso}` : query;
    const payload = await searchGitHubIssues(searchQuery, limit);
    const mapped = mapGitHubIssues(query, payload.items ?? []);
    items.push(...mapped);

    for (const item of mapped) {
      if (item.createdAt && (!latestIso || item.createdAt > latestIso)) {
        latestIso = item.createdAt;
      }
    }
  }

  const uniqueItems = items.filter((item, index, allItems) => (
    allItems.findIndex((candidate) => candidate.externalId === item.externalId) === index
  ));
  const result = await persistIngestedItems('github', uniqueItems);

  return {
    source: 'github',
    fetchedCount: result.fetchedCount,
    persistedCount: result.persistedCount,
    queries,
    checkpoint: latestIso ? { isoTimestamp: latestIso } : (params?.checkpoint ?? null)
  };
}
