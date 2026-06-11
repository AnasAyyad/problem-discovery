import { hashText } from '../../../lib/hash.js';
import { stripHtml } from '../web/web.extract.js';
import { sourceItemSchema, type SourceItemInput } from '../../source-items/source-item.schema.js';

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

export function mapStackExchangeQuestions(
  query: string,
  site: string,
  questions: StackExchangeQuestion[]
): SourceItemInput[] {
  return questions.flatMap((question) => {
    const sourceUrl = question.link?.trim();
    const title = question.title?.trim() ?? null;
    const body = stripHtml(question.body ?? '');

    if (!sourceUrl || !body) {
      return [];
    }

    const externalId = question.question_id
      ? `${site}-${question.question_id}`
      : hashText(`${site}:${sourceUrl}:${query}`);

    return [
      sourceItemSchema.parse({
        source: 'stackexchange',
        sourceKind: 'complaint',
        externalId,
        sourceUrl,
        title,
        body,
        authorName: question.owner?.display_name?.trim() ?? null,
        createdAt: question.creation_date ? new Date(question.creation_date * 1000).toISOString() : null,
        normalizedText: body.replace(/\s+/g, ' ').trim(),
        matchedQuery: query,
        sourceContext: {
          site,
          score: question.score ?? 0,
          answerCount: question.answer_count ?? 0,
          tags: question.tags ?? []
        },
        rawPayload: {
          ...question,
          query,
          site
        }
      })
    ];
  });
}
