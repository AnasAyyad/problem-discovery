import { runPipeline, type PipelineProgressEvent } from '../modules/pipeline/pipeline.service.js';
import { parseDiscoveryKeywords } from '../modules/ingestion/ingestion.keywords.js';

function parsePositiveNumber(value: string | undefined, flagName: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }

  return parsed;
}

function parseKeywordsArg(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const keywords = parseDiscoveryKeywords(value);
  return keywords.length > 0 ? keywords : undefined;
}

const args = process.argv.slice(2);
const positionalArgs: string[] = [];
let embedLimit: number | undefined;
let extractLimit: number | undefined;
let discoveryKeywords: string[] | undefined;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (!arg) {
    continue;
  }

  if (arg === '--embed-limit') {
    const value = args[index + 1];
    embedLimit = parsePositiveNumber(value, '--embed-limit');
    index += 1;
    continue;
  }

  if (arg === '--extract-limit') {
    const value = args[index + 1];
    extractLimit = parsePositiveNumber(value, '--extract-limit');
    index += 1;
    continue;
  }

  if (arg === '--keywords') {
    discoveryKeywords = parseKeywordsArg(args[index + 1]);
    index += 1;
    continue;
  }

  positionalArgs.push(arg);
}

const subreddit = positionalArgs[0] ?? 'smallbusiness';

function formatProgress(event: PipelineProgressEvent): string | null {
  switch (event.type) {
    case 'step_started':
      return `[pipeline] starting ${event.step}`;
    case 'step_completed':
      return `[pipeline] finished ${event.step}`;
    case 'ingestion_source_completed': {
      const meta = event.meta as { source: string; fetchedCount: number; persistedCount: number; };
      return `[ingest] ${meta.source}: completed, fetched=${meta.fetchedCount}, persisted=${meta.persistedCount}`;
    }
    case 'ingestion_source_skipped': {
      const meta = event.meta as { source: string; };
      return `[ingest] ${meta.source}: skipped${event.message ? ` (${event.message})` : ''}`;
    }
    case 'ingestion_source_failed': {
      const meta = event.meta as { source: string; };
      return `[ingest] ${meta.source}: failed${event.message ? ` (${event.message})` : ''}`;
    }
    case 'embedding_started': {
      const meta = event.meta as { total: number; };
      return `[embed] queued ${meta.total} item(s)`;
    }
    case 'embedding_progress': {
      const meta = event.meta as { total: number; completed: number; sourceItemId?: number; };
      return `[embed] ${meta.completed}/${meta.total} completed${meta.sourceItemId ? ` (source_item_id=${meta.sourceItemId})` : ''}`;
    }
    case 'extraction_started': {
      const meta = event.meta as { total: number; };
      return `[extract] queued ${meta.total} item(s)`;
    }
    case 'extraction_progress': {
      const meta = event.meta as {
        total: number;
        completed: number;
        successCount: number;
        failureCount: number;
        sourceItemId?: number;
        stage: string;
      };
      const outcome = meta.stage === 'item_failed' ? 'failed' : 'ok';
      const errorSuffix = event.message ? `, error=${event.message}` : '';
      return `[extract] ${meta.completed}/${meta.total} ${outcome}${meta.sourceItemId ? ` (source_item_id=${meta.sourceItemId})` : ''}, success=${meta.successCount}, failed=${meta.failureCount}${errorSuffix}`;
    }
    default:
      return null;
  }
}

runPipeline({
  subreddit,
  ...(discoveryKeywords ? { discoveryKeywords } : {}),
  ...(embedLimit ? { embedLimit } : {}),
  ...(extractLimit ? { extractLimit } : {}),
  onProgress: (event) => {
    const line = formatProgress(event);

    if (line) {
      console.log(line);
    }
  }
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error('Pipeline run failed', error);
    process.exitCode = 1;
  });
