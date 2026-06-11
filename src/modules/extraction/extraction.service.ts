import { buildExtractionPrompt } from './extraction.prompts.js';
import { env } from '../../config/env.js';
import { listPendingExtractionSourceItems } from '../source-items/source-item.repository.js';

import { generateStructuredExtraction } from './extraction.client.js';
import { EXTRACTION_PROMPT_VERSION } from './extraction.prompts.js';
import { insertEvidenceExtraction } from './extraction.repository.js';
import { extractionSchema, type ExtractionResult } from './extraction.schema.js';

export async function extractOpportunity(text: string): Promise<ExtractionResult> {
  const prompt = buildExtractionPrompt(text);
  const raw = await generateStructuredExtraction(prompt);
  return extractionSchema.parse(JSON.parse(raw));
}

export async function extractPendingSourceItems(limit = 10): Promise<{
  processedCount: number;
  successCount: number;
  failureCount: number;
}> {
  const items = await listPendingExtractionSourceItems(
    env.OLLAMA_CHAT_MODEL,
    EXTRACTION_PROMPT_VERSION,
    env.EXTRACTION_MAX_ATTEMPTS,
    limit
  );
  let successCount = 0;
  let failureCount = 0;

  for (const item of items) {
    const text = item.title ? `${item.title}\n\n${item.body}` : item.body;

    try {
      const extracted = await extractOpportunity(text);
      await insertEvidenceExtraction({
        sourceItemId: item.id,
        modelName: env.OLLAMA_CHAT_MODEL,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        extractedJson: extracted,
        confidenceScore: extracted.confidence_score,
        parseSuccess: true
      });
      successCount += 1;
    } catch (error: unknown) {
      await insertEvidenceExtraction({
        sourceItemId: item.id,
        modelName: env.OLLAMA_CHAT_MODEL,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        extractedJson: {
          error: error instanceof Error ? error.message : 'Unknown extraction error'
        },
        confidenceScore: 0,
        parseSuccess: false
      });
      failureCount += 1;
    }
  }

  return {
    processedCount: items.length,
    successCount,
    failureCount
  };
}
