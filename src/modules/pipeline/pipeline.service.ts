import { ingestRedditHot } from '../ingestion/reddit/reddit.ingest.js';
import { embedPendingSourceItems } from '../embeddings/embeddings.service.js';
import { extractPendingSourceItems } from '../extraction/extraction.service.js';
import { materializeOpportunities } from '../opportunities/opportunity.service.js';
import { nowIso } from '../../lib/time.js';

import { finishPipelineStep, startPipelineStep } from './pipeline.repository.js';

import type { PipelineRunSummary } from './pipeline.types.js';

async function runTrackedStep<T extends Record<string, unknown>>(
  name: string,
  meta: Record<string, unknown>,
  work: () => Promise<T>
): Promise<{ name: string; status: 'completed'; meta: T; }> {
  const runId = await startPipelineStep(name, meta);

  try {
    const result = await work();
    await finishPipelineStep(runId, 'completed', result);
    return {
      name,
      status: 'completed',
      meta: result
    };
  } catch (error: unknown) {
    await finishPipelineStep(
      runId,
      'failed',
      meta,
      error instanceof Error ? error.message : 'Unknown pipeline error'
    );
    throw error;
  }
}

export async function runPipeline(options?: { subreddit?: string; }): Promise<PipelineRunSummary> {
  const subreddit = options?.subreddit ?? 'smallbusiness';
  const startedAt = nowIso();

  const ingestStep = await runTrackedStep('ingest', { subreddit }, async () => ingestRedditHot(subreddit));
  const embedStep = await runTrackedStep('embed', { subreddit }, async () => embedPendingSourceItems());
  const extractStep = await runTrackedStep('extract', { subreddit }, async () => extractPendingSourceItems());
  const scoreStep = await runTrackedStep('score', { subreddit }, async () => materializeOpportunities());

  return {
    subreddit,
    steps: [ingestStep, embedStep, extractStep, scoreStep],
    startedAt,
    finishedAt: nowIso()
  };
}