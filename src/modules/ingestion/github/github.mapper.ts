import { hashText } from '../../../lib/hash.js';
import { sourceItemSchema, type SourceItemInput } from '../../source-items/source-item.schema.js';

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

function extractRepositoryName(repositoryUrl: string | undefined): string | null {
  if (!repositoryUrl) {
    return null;
  }

  const match = repositoryUrl.match(/repos\/(.+)$/);
  return match?.[1] ?? null;
}

export function mapGitHubIssues(query: string, issues: GitHubIssue[]): SourceItemInput[] {
  return issues.flatMap((issue) => {
    const sourceUrl = issue.html_url?.trim();
    const title = issue.title?.trim() ?? null;
    const body = issue.body?.trim() || title;

    if (!sourceUrl || !body) {
      return [];
    }

    const externalId = issue.id ? String(issue.id) : hashText(`github:${sourceUrl}:${query}`);

    return [
      sourceItemSchema.parse({
        source: 'github',
        sourceKind: 'complaint',
        externalId,
        sourceUrl,
        title,
        body,
        authorName: issue.user?.login?.trim() ?? null,
        createdAt: issue.created_at ?? null,
        normalizedText: body.replace(/\s+/g, ' ').trim(),
        matchedQuery: query,
        sourceContext: {
          query,
          repository: extractRepositoryName(issue.repository_url),
          commentCount: issue.comments ?? 0,
          labels: issue.labels?.map((label) => label.name).filter(Boolean) ?? []
        },
        rawPayload: {
          ...issue,
          query
        }
      })
    ];
  });
}
