import { AppError } from '../../lib/errors.js';
import { getOpportunities } from '../opportunities/opportunity.service.js';

import {
  completePipelineJob,
  createPipelineJob,
  failPipelineJob,
  getPipelineJob,
  updatePipelineJobProgress,
  type PipelineJobRecord
} from './pipeline-job.repository.js';
import { runPipeline, type PipelineProgressEvent, type PipelineRunOptions } from './pipeline.service.js';

interface PipelineJobProgressState {
  status: 'running' | 'completed' | 'failed';
  percent: number;
  currentStep: string;
  message: string;
  startedAt: string;
  finishedAt: string | null;
  sourceResults: Array<{
    source: string;
    status: string;
    fetchedCount: number;
    persistedCount: number;
    message?: string;
  }>;
  steps: {
    ingest: 'pending' | 'running' | 'completed' | 'failed';
    embed: 'pending' | 'running' | 'completed' | 'failed';
    extract: 'pending' | 'running' | 'completed' | 'failed';
    score: 'pending' | 'running' | 'completed' | 'failed';
  };
  stepDetails: {
    ingest: { startedAt: string | null; finishedAt: string | null; };
    embed: { startedAt: string | null; finishedAt: string | null; };
    extract: { startedAt: string | null; finishedAt: string | null; };
    score: { startedAt: string | null; finishedAt: string | null; };
  };
  embed: {
    total: number;
    completed: number;
  };
  extract: {
    total: number;
    completed: number;
    successCount: number;
    failureCount: number;
  };
  recentEvents: string[];
}

interface CreatePipelineJobInput {
  keywords?: string[];
  webUrls?: string[];
  ingestLimit?: number;
  extractLimit?: number;
}

function createInitialProgress(): PipelineJobProgressState {
  const now = new Date().toISOString();
  return {
    status: 'running',
    percent: 0,
    currentStep: 'queued',
    message: 'Pipeline queued',
    startedAt: now,
    finishedAt: null,
    sourceResults: [],
    steps: {
      ingest: 'pending',
      embed: 'pending',
      extract: 'pending',
      score: 'pending'
    },
    stepDetails: {
      ingest: { startedAt: null, finishedAt: null },
      embed: { startedAt: null, finishedAt: null },
      extract: { startedAt: null, finishedAt: null },
      score: { startedAt: null, finishedAt: null }
    },
    embed: {
      total: 0,
      completed: 0
    },
    extract: {
      total: 0,
      completed: 0,
      successCount: 0,
      failureCount: 0
    },
    recentEvents: ['Pipeline queued']
  };
}

function pushRecentEvent(progress: PipelineJobProgressState, message: string): PipelineJobProgressState {
  return {
    ...progress,
    recentEvents: [...progress.recentEvents, message].slice(-12)
  };
}

function stepPercent(progress: PipelineJobProgressState): number {
  const completedSteps = Object.values(progress.steps).filter((status) => status === 'completed').length;
  const runningStep = Object.values(progress.steps).some((status) => status === 'running');
  const basePercent = completedSteps * 25;

  if (progress.steps.embed === 'running' && progress.embed.total > 0) {
    return Math.min(99, Math.round(basePercent + (progress.embed.completed / progress.embed.total) * 25));
  }

  if (progress.steps.extract === 'running' && progress.extract.total > 0) {
    return Math.min(99, Math.round(basePercent + (progress.extract.completed / progress.extract.total) * 25));
  }

  if (runningStep) {
    return Math.min(99, basePercent + 5);
  }

  return Math.min(99, basePercent);
}

function reduceProgress(progress: PipelineJobProgressState, event: PipelineProgressEvent): PipelineJobProgressState {
  const now = new Date().toISOString();

  switch (event.type) {
    case 'step_started': {
      if (!event.step) {
        return progress;
      }

      const next = {
        ...progress,
        currentStep: event.step,
        message: `Running ${event.step}`,
        steps: {
          ...progress.steps,
          [event.step]: 'running'
        },
        stepDetails: {
          ...progress.stepDetails,
          [event.step]: {
            startedAt: progress.stepDetails[event.step as keyof PipelineJobProgressState['stepDetails']].startedAt ?? now,
            finishedAt: null
          }
        }
      } as PipelineJobProgressState;

      const withEvent = pushRecentEvent(next, `Started ${event.step}`);
      return {
        ...withEvent,
        percent: stepPercent(withEvent)
      };
    }
    case 'step_completed': {
      if (!event.step) {
        return progress;
      }

      const next = {
        ...progress,
        currentStep: event.step,
        message: `Completed ${event.step}`,
        steps: {
          ...progress.steps,
          [event.step]: 'completed'
        },
        stepDetails: {
          ...progress.stepDetails,
          [event.step]: {
            startedAt: progress.stepDetails[event.step as keyof PipelineJobProgressState['stepDetails']].startedAt ?? now,
            finishedAt: now
          }
        }
      } as PipelineJobProgressState;

      const withEvent = pushRecentEvent(next, `Completed ${event.step}`);
      return {
        ...withEvent,
        percent: stepPercent(withEvent)
      };
    }
    case 'ingestion_source_completed':
    case 'ingestion_source_skipped':
    case 'ingestion_source_failed': {
      const sourceResult = event.meta as PipelineJobProgressState['sourceResults'][number];
      const sourceResults = [
        ...progress.sourceResults.filter((item) => item.source !== sourceResult.source),
        sourceResult
      ];
      const next = {
        ...progress,
        currentStep: 'ingest',
        message: `${sourceResult.source} ${sourceResult.status}`,
        sourceResults
      };
      const withEvent = pushRecentEvent(
        next,
        `${sourceResult.source}: ${sourceResult.status}${sourceResult.message ? ` (${sourceResult.message})` : ''}`
      );
      return {
        ...withEvent,
        percent: stepPercent(withEvent)
      };
    }
    case 'embedding_started': {
      const meta = event.meta as { total: number; };
      const next = {
        ...progress,
        currentStep: 'embed',
        message: `Embedding ${meta.total} item(s)`,
        embed: {
          total: meta.total,
          completed: 0
        }
      };
      const withEvent = pushRecentEvent(next, `Embedding queue: ${meta.total}`);
      return {
        ...withEvent,
        percent: stepPercent(withEvent)
      };
    }
    case 'embedding_progress': {
      const meta = event.meta as { total: number; completed: number; };
      const next = {
        ...progress,
        currentStep: 'embed',
        message: `Embedded ${meta.completed}/${meta.total}`,
        embed: {
          total: meta.total,
          completed: meta.completed
        }
      };
      return {
        ...next,
        percent: stepPercent(next)
      };
    }
    case 'extraction_started': {
      const meta = event.meta as { total: number; };
      const next = {
        ...progress,
        currentStep: 'extract',
        message: `Extracting evidence from ${meta.total} item(s)`,
        extract: {
          total: meta.total,
          completed: 0,
          successCount: 0,
          failureCount: 0
        }
      };
      const withEvent = pushRecentEvent(next, `Extraction queue: ${meta.total}`);
      return {
        ...withEvent,
        percent: stepPercent(withEvent)
      };
    }
    case 'extraction_progress': {
      const meta = event.meta as {
        total: number;
        completed: number;
        successCount: number;
        failureCount: number;
        stage: string;
      };
      const next = {
        ...progress,
        currentStep: 'extract',
        message: `Extracted ${meta.completed}/${meta.total} (ok ${meta.successCount}, failed ${meta.failureCount})`,
        extract: {
          total: meta.total,
          completed: meta.completed,
          successCount: meta.successCount,
          failureCount: meta.failureCount
        }
      };
      const withEvent = meta.stage === 'item_failed'
        ? pushRecentEvent(next, `Extraction failed${event.message ? `: ${event.message}` : ''}`)
        : next;
      return {
        ...withEvent,
        percent: stepPercent(withEvent)
      };
    }
    default:
      return progress;
  }
}

function validateLimit(name: string, value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 5 || value > 100) {
    throw new AppError(`${name} must be an integer between 5 and 100`, 400);
  }

  return value;
}

function normalizeList(values?: string[]): string[] | undefined {
  if (!values) {
    return undefined;
  }

  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

export async function startPipelineJob(input: CreatePipelineJobInput): Promise<PipelineJobRecord> {
  const keywords = normalizeList(input.keywords);
  const webUrls = normalizeList(input.webUrls);
  const ingestLimit = validateLimit('ingestLimit', input.ingestLimit);
  const extractLimit = validateLimit('extractLimit', input.extractLimit);

  const config = {
    ...(keywords ? { keywords } : {}),
    ...(webUrls ? { webUrls } : {}),
    ...(ingestLimit ? { ingestLimit } : {}),
    ...(extractLimit ? { extractLimit } : {})
  };

  const initialProgress = createInitialProgress();
  const job = await createPipelineJob(config, initialProgress);

  void runPipelineJob(job.id, {
    ...(keywords ? { discoveryKeywords: keywords } : {}),
    ...(webUrls ? { webUrls } : {}),
    ...(ingestLimit ? { ingestLimit } : {}),
    ...(extractLimit ? { extractLimit } : {})
  });

  return job;
}

async function runPipelineJob(jobId: number, options: PipelineRunOptions & { webUrls?: string[]; ingestLimit?: number; }): Promise<void> {
  let progress = createInitialProgress();

  try {
    const result = await runPipeline({
      ...options,
      onProgress: async (event) => {
        progress = reduceProgress(progress, event);
        await updatePipelineJobProgress(jobId, progress);
      }
    });

    const opportunities = await getOpportunities(25);
    progress = {
      ...progress,
      status: 'completed',
      currentStep: 'done',
      message: 'Pipeline completed',
      percent: 100,
      finishedAt: new Date().toISOString()
    };
    await completePipelineJob(jobId, progress, {
      pipeline: result,
      opportunities
    });
  } catch (error: unknown) {
    const errorText = error instanceof Error ? error.message : 'Unknown pipeline failure';
    const failedStep = progress.currentStep && progress.currentStep in progress.steps
      ? progress.currentStep as keyof PipelineJobProgressState['steps']
      : null;
    progress = {
      ...progress,
      status: 'failed',
      message: errorText,
      currentStep: 'failed',
      finishedAt: new Date().toISOString(),
      steps: failedStep ? {
        ...progress.steps,
        [failedStep]: 'failed'
      } : progress.steps,
      stepDetails: failedStep ? {
        ...progress.stepDetails,
        [failedStep]: {
          startedAt: progress.stepDetails[failedStep].startedAt,
          finishedAt: new Date().toISOString()
        }
      } : progress.stepDetails
    };
    await failPipelineJob(jobId, progress, errorText);
  }
}

export async function getPipelineJobStatus(jobId: number): Promise<PipelineJobRecord> {
  const job = await getPipelineJob(jobId);

  if (!job) {
    throw new AppError(`Pipeline job ${jobId} was not found`, 404);
  }

  return job;
}
