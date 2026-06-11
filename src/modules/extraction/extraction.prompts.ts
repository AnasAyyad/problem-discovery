export const EXTRACTION_PROMPT_VERSION = 'v1';

export function buildExtractionPrompt(input: string): string {
  return [
    'Extract structured business pain information from the complaint below.',
    'Return JSON only with the keys:',
    'problem, target_customer, pain_description, evidence, current_workaround, business_impact, potential_solution, estimated_pricing, competition, mvp_scope, opportunity_score, confidence_score.',
    '',
    'Complaint:',
    input
  ].join('\n');
}