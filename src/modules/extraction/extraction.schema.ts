import { z } from 'zod';

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

const stringArraySchema = z.preprocess((value) => normalizeStringArray(value), z.array(z.string()));
const numericScoreSchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  if (typeof value === 'number') {
    return Math.max(0, Math.min(100, value));
  }

  const match = value.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return 50;
  }

  const numericValue = Number(match[0]);

  if (Number.isNaN(numericValue)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Could not normalize score value'
    });
    return z.NEVER;
  }

  return Math.max(0, Math.min(100, numericValue));
});

export const extractionSchema = z.object({
  problem: z.string().min(1),
  target_customer: z.string().min(1),
  pain_description: z.string().min(1),
  evidence: stringArraySchema.default([]),
  current_workaround: z.string().default(''),
  business_impact: z.string().min(1),
  potential_solution: z.string().min(1),
  estimated_pricing: z.string().default(''),
  competition: stringArraySchema.default([]),
  mvp_scope: z.string().min(1),
  opportunity_score: numericScoreSchema,
  confidence_score: numericScoreSchema
});

export type ExtractionResult = z.infer<typeof extractionSchema>;