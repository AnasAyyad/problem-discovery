import { AppError } from '../../../lib/errors.js';

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

interface HackerNewsSearchResponse {
  hits?: HackerNewsHit[];
}

export async function searchHackerNews(query: string, limit = 10): Promise<HackerNewsHit[]> {
  const url = new URL('https://hn.algolia.com/api/v1/search_by_date');
  url.searchParams.set('query', query);
  url.searchParams.set('tags', '(story,comment)');
  url.searchParams.set('hitsPerPage', String(limit));

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new AppError(`Hacker News request failed with status ${response.status}`, response.status);
  }

  const payload = await response.json() as HackerNewsSearchResponse;
  return payload.hits ?? [];
}
