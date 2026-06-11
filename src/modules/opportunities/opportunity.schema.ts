import { z } from 'zod';

export const opportunityResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      problem: z.string(),
      targetCustomer: z.string(),
      opportunityScore: z.number(),
      confidenceScore: z.number()
    })
  )
});