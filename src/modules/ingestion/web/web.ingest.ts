import { env } from '../../../config/env.js';
import { hashText } from '../../../lib/hash.js';
import { persistIngestedItems } from '../ingestion.service.js';
import { sourceItemSchema, type SourceItemInput } from '../../source-items/source-item.schema.js';

import { fetchHtml } from './web.client.js';
import { stripHtml } from './web.extract.js';

function getConfiguredUrls(): string[] {
  return env.WEB_INGEST_URLS
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || null;
}

async function buildSourceItem(url: string): Promise<SourceItemInput | null> {
  const html = await fetchHtml(url);
  const title = extractTitle(html);
  const body = stripHtml(html);

  if (!body) {
    return null;
  }

  return sourceItemSchema.parse({
    source: 'web',
    externalId: hashText(url),
    sourceUrl: url,
    title,
    body,
    authorName: null,
    createdAt: null,
    normalizedText: body,
    rawPayload: {
      url,
      title
    }
  });
}

export async function ingestGenericWebSource(
  urlsOverride?: string[],
  limit?: number
): Promise<{
  source: string;
  fetchedCount: number;
  persistedCount: number;
  urls: string[];
}> {
  const urls = (urlsOverride && urlsOverride.length > 0 ? urlsOverride : getConfiguredUrls())
    .slice(0, limit);

  if (urls.length === 0) {
    return {
      source: 'web',
      fetchedCount: 0,
      persistedCount: 0,
      urls: []
    };
  }

  const items: SourceItemInput[] = [];

  for (const url of urls) {
    const item = await buildSourceItem(url);

    if (item) {
      items.push(item);
    }
  }

  const result = await persistIngestedItems('web', items);

  return {
    source: 'web',
    fetchedCount: result.fetchedCount,
    persistedCount: result.persistedCount,
    urls
  };
}
