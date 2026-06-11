import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';

interface GitHubIssue {
  id?: number;
  html_url?: string;
  title?: string;
  body?: string | null;
  created_at?: string;
  user?: {
    login?: string;
  };
  comments?: number;
  repository_url?: string;
  labels?: Array<{ name?: string }>;
}

interface GitHubIssueSearchResponse {
  items?: GitHubIssue[];
}

export async function searchGitHubIssues(query: string, limit = 25): Promise<GitHubIssueSearchResponse> {
  if (!env.GITHUB_TOKEN) {
    throw new AppError('Missing GITHUB_TOKEN', 400);
  }

  const scopes: string[] = [];
  const repos = env.GITHUB_REPOS.split(',').map((value) => value.trim()).filter(Boolean);
  const orgs = env.GITHUB_ORGS.split(',').map((value) => value.trim()).filter(Boolean);

  scopes.push(...repos.map((repo) => `repo:${repo}`));
  scopes.push(...orgs.map((org) => `org:${org}`));

  if (scopes.length === 0) {
    throw new AppError('GitHub issue search requires GITHUB_REPOS or GITHUB_ORGS to be configured', 400);
  }

  const searchQuery = `${query} is:issue ${scopes.join(' ')}`.trim();
  const url = new URL('https://api.github.com/search/issues');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('sort', 'created');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(limit));

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': env.INGEST_USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    throw new AppError(`GitHub issue search failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<GitHubIssueSearchResponse>;
}
