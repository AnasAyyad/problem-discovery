import { persistIngestedItems } from '../ingestion.service.js';
import { getDiscoveryKeywords } from '../ingestion.keywords.js';

import { searchHackerNews } from './hackernews.client.js';
import { mapHackerNewsHits } from './hackernews.mapper.js';

export async function ingestHackerNewsSearches(
  discoveryKeywords?: string[],
  limit = 10
): Promise<{
  source: string;
  fetchedCount: number;
  persistedCount: number;
  queries: string[];
}> {
  const queries = getDiscoveryKeywords(discoveryKeywords);

  if (queries.length === 0) {
    return {
      source: 'hackernews',
      fetchedCount: 0,
      persistedCount: 0,
      queries: []
    };
  }

  const allItems = [];

  for (const query of queries) {
    const hits = await searchHackerNews(query, limit);
    allItems.push(...mapHackerNewsHits(query, hits));
  }

  const uniqueItems = allItems.filter((item, index, items) => (
    items.findIndex((candidate) => candidate.externalId === item.externalId) === index
  ));

  const result = await persistIngestedItems('hackernews', uniqueItems);

  return {
    source: 'hackernews',
    fetchedCount: result.fetchedCount,
    persistedCount: result.persistedCount,
    queries
  };
}
