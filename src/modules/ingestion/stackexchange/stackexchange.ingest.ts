import { persistIngestedItems } from '../ingestion.service.js';
import { getDiscoveryKeywords } from '../ingestion.keywords.js';
import type { IngestionCheckpoint } from '../ingestion.registry.js';

import { searchStackExchangeQuestions } from './stackexchange.client.js';
import { mapStackExchangeQuestions } from './stackexchange.mapper.js';

export async function ingestStackExchangeSearches(params?: {
  discoveryKeywords?: string[];
  sites?: string[];
  checkpoint?: IngestionCheckpoint | null;
  limit?: number;
}): Promise<{
  source: string;
  fetchedCount: number;
  persistedCount: number;
  queries: string[];
  sites: string[];
  checkpoint: IngestionCheckpoint | null;
}> {
  const queries = getDiscoveryKeywords(params?.discoveryKeywords);
  const sites = (params?.sites ?? []).filter(Boolean);
  const fromDateUnix = params?.checkpoint?.unixTimestamp ?? undefined;
  const pageSize = params?.limit ?? 25;

  if (queries.length === 0 || sites.length === 0) {
    return {
      source: 'stackexchange',
      fetchedCount: 0,
      persistedCount: 0,
      queries,
      sites,
      checkpoint: params?.checkpoint ?? null
    };
  }

  const items = [];
  let maxCreationDate = fromDateUnix ?? 0;

  for (const site of sites) {
    for (const query of queries) {
      const payload = await searchStackExchangeQuestions({
        query,
        site,
        ...(fromDateUnix ? { fromDateUnix } : {}),
        pageSize
      });

      const mapped = mapStackExchangeQuestions(query, site, payload.items ?? []);
      items.push(...mapped);

      for (const item of mapped) {
        const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
        if (createdAt > 0) {
          maxCreationDate = Math.max(maxCreationDate, Math.floor(createdAt / 1000));
        }
      }
    }
  }

  const uniqueItems = items.filter((item, index, allItems) => (
    allItems.findIndex((candidate) => candidate.externalId === item.externalId) === index
  ));
  const result = await persistIngestedItems('stackexchange', uniqueItems);

  return {
    source: 'stackexchange',
    fetchedCount: result.fetchedCount,
    persistedCount: result.persistedCount,
    queries,
    sites,
    checkpoint: maxCreationDate > 0 ? { unixTimestamp: maxCreationDate } : (params?.checkpoint ?? null)
  };
}
