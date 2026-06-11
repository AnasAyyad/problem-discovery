import { hashText } from '../../../lib/hash.js';
import { sourceItemSchema, type SourceItemInput } from '../../source-items/source-item.schema.js';

interface HackerNewsHit {
  objectID?: string;
  created_at?: string;
  author?: string;
  title?: string;
  story_title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  story_url?: string;
}

function stripSimpleHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function mapHackerNewsHits(query: string, hits: HackerNewsHit[]): SourceItemInput[] {
  return hits.flatMap((hit) => {
    const title = hit.title?.trim() || hit.story_title?.trim() || null;
    const rawBody = hit.comment_text?.trim() || hit.story_text?.trim() || title;
    const sourceUrl = hit.url?.trim() || hit.story_url?.trim() || null;

    if (!rawBody || !sourceUrl) {
      return [];
    }

    const body = stripSimpleHtml(rawBody);

    if (!body) {
      return [];
    }

    const externalId = hit.objectID?.trim() || hashText(`hn:${sourceUrl}:${query}`);

    return [
      sourceItemSchema.parse({
        source: 'hackernews',
        sourceKind: 'complaint',
        externalId,
        sourceUrl,
        title,
        body,
        authorName: hit.author?.trim() ?? null,
        createdAt: hit.created_at ?? null,
        normalizedText: body.replace(/\s+/g, ' ').trim(),
        matchedQuery: query,
        sourceContext: {
          query
        },
        rawPayload: {
          ...hit,
          query
        }
      })
    ];
  });
}
