import { z } from 'zod';

export const sourceItemSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  sourceUrl: z.url(),
  title: z.string().nullable(),
  body: z.string().min(1),
  authorName: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  normalizedText: z.string().min(1),
  rawPayload: z.unknown()
});

export type SourceItemInput = z.infer<typeof sourceItemSchema>;