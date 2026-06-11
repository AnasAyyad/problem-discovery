import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';

interface StackExchangeQuestion {
  question_id?: number;
  title?: string;
  body?: string;
  link?: string;
  creation_date?: number;
  owner?: {
    display_name?: string;
  };
  score?: number;
  answer_count?: number;
  tags?: string[];
}

interface StackExchangeSearchResponse {
  items?: StackExchangeQuestion[];
  has_more?: boolean;
}

export async function searchStackExchangeQuestions(params: {
  query: string;
  site: string;
  fromDateUnix?: number;
  pageSize?: number;
}): Promise<StackExchangeSearchResponse> {
  const url = new URL('https://api.stackexchange.com/2.3/search/advanced');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('sort', 'creation');
  url.searchParams.set('site', params.site);
  url.searchParams.set('q', params.query);
  url.searchParams.set('pagesize', String(params.pageSize ?? 25));
  url.searchParams.set('filter', 'withbody');

  if (params.fromDateUnix) {
    url.searchParams.set('fromdate', String(params.fromDateUnix));
  }

  if (env.STACKEXCHANGE_KEY) {
    url.searchParams.set('key', env.STACKEXCHANGE_KEY);
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': env.INGEST_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new AppError(`Stack Exchange request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<StackExchangeSearchResponse>;
}
