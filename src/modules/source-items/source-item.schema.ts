import { z } from 'zod';

export const sourceItemSchema = z.object({
  source: z.string().min(1),
  sourceKind: z.enum(['complaint', 'signal']).default('complaint'),
  externalId: z.string().min(1),
  sourceUrl: z.url(),
  title: z.string().nullable(),
  body: z.string().min(1),
  authorName: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  normalizedText: z.string().min(1),
  matchedQuery: z.string().trim().min(1).nullable().default(null),
  sourceContext: z.record(z.string(), z.unknown()).default({}),
  rawPayload: z.unknown()
});

export type SourceItemInput = z.infer<typeof sourceItemSchema>;
