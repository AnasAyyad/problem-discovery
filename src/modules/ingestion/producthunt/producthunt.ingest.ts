import type { IngestionCheckpoint, SignalEventInput } from '../ingestion.registry.js';

import { fetchProductHuntPosts } from './producthunt.client.js';

interface ProductHuntPost {
  id?: string;
  name?: string;
  tagline?: string;
  votesCount?: number;
  createdAt?: string;
  website?: string;
}

export async function ingestProductHuntSignals(params?: {
  checkpoint?: IngestionCheckpoint | null;
  limit?: number;
}): Promise<{
  source: string;
  fetchedCount: number;
  persistedCount: number;
  signals: SignalEventInput[];
  checkpoint: IngestionCheckpoint | null;
}> {
  const posts = await fetchProductHuntPosts(params?.limit ?? 10) as ProductHuntPost[];
  let latestIso = params?.checkpoint?.isoTimestamp ?? null;

  const signals = posts.map((post) => {
    if (post.createdAt && (!latestIso || post.createdAt > latestIso)) {
      latestIso = post.createdAt;
    }

    return {
      source: 'producthunt',
      signalKind: 'launch_interest',
      externalId: post.id ?? `${post.name ?? 'unknown'}:${post.createdAt ?? ''}`,
      matchedQuery: null,
      title: post.name?.trim() ?? null,
      sourceUrl: post.website?.trim() ?? null,
      signalValue: Number(post.votesCount ?? 0),
      createdAt: post.createdAt ?? null,
      rawPayload: post
    } satisfies SignalEventInput;
  });

  return {
    source: 'producthunt',
    fetchedCount: signals.length,
    persistedCount: signals.length,
    signals,
    checkpoint: latestIso ? { isoTimestamp: latestIso } : (params?.checkpoint ?? null)
  };
}
