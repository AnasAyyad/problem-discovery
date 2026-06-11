import { sourceItemSchema, type SourceItemInput } from '../../source-items/source-item.schema.js';

interface RedditListing {
  data?: {
    children?: Array<{
      data?: {
        id?: string;
        permalink?: string;
        title?: string;
        selftext?: string;
        author?: string;
        created_utc?: number;
      };
    }>;
  };
}

export function mapRedditListing(payload: unknown, subreddit: string): SourceItemInput[] {
  const listing = payload as RedditListing;
  const children = listing.data?.children ?? [];

  return children.flatMap((child) => {
    const data = child.data;

    if (!data?.id || !data.permalink) {
      return [];
    }

    const body = data.selftext?.trim() || data.title?.trim();

    if (!body) {
      return [];
    }

    return [
      sourceItemSchema.parse({
        source: 'reddit',
        sourceKind: 'complaint',
        externalId: data.id,
        sourceUrl: `https://www.reddit.com${data.permalink}`,
        title: data.title?.trim() ?? null,
        body,
        authorName: data.author?.trim() ?? null,
        createdAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : null,
        normalizedText: body.replace(/\s+/g, ' ').trim(),
        matchedQuery: null,
        sourceContext: {
          subreddit
        },
        rawPayload: data
      })
    ];
  });
}
