import { mapRedditListing } from './reddit.mapper.js';
import { fetchRedditJson } from './reddit.client.js';
import { persistIngestedItems } from '../ingestion.service.js';

export async function ingestRedditHot(
  subreddit: string,
  limit = 25
): Promise<{ subreddit: string; persistedCount: number; fetchedCount: number; }> {
  const payload = await fetchRedditJson(`/r/${subreddit}/hot.json?limit=${limit}`);
  const items = mapRedditListing(payload);
  const result = await persistIngestedItems('reddit', items);

  return {
    subreddit,
    fetchedCount: result.fetchedCount,
    persistedCount: result.persistedCount
  };
}
