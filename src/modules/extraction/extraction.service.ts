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

export async function extractPendingSourceItems(
  limit = 10,
  onProgress?: (event: {
    stage: 'started' | 'item_succeeded' | 'item_failed';
    total: number;
    completed: number;
    successCount: number;
    failureCount: number;
    sourceItemId?: number;
    errorMessage?: string;
  }) => void
): Promise<{
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
  onProgress?.({
    stage: 'started',
    total: items.length,
    completed: 0,
    successCount,
    failureCount
  });

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
      onProgress?.({
        stage: 'item_succeeded',
        total: items.length,
        completed: successCount + failureCount,
        successCount,
        failureCount,
        sourceItemId: item.id
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      await insertEvidenceExtraction({
        sourceItemId: item.id,
        modelName: env.OLLAMA_CHAT_MODEL,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        extractedJson: {
          error: errorMessage
        },
        confidenceScore: 0,
        parseSuccess: false
      });
      failureCount += 1;
      onProgress?.({
        stage: 'item_failed',
        total: items.length,
        completed: successCount + failureCount,
        successCount,
        failureCount,
        sourceItemId: item.id,
        errorMessage
      });
    }
  }

  return {
    processedCount: items.length,
    successCount,
    failureCount
  };
}
