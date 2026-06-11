import { runIngestionSources } from '../modules/ingestion/ingestion.runner.js';
import { parseDiscoveryKeywords } from '../modules/ingestion/ingestion.keywords.js';

function parseKeywordsArg(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const keywords = parseDiscoveryKeywords(value);
  return keywords.length > 0 ? keywords : undefined;
}

const args = process.argv.slice(2);
const positionalArgs: string[] = [];
let keywords: string[] | undefined;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (!arg) {
    continue;
  }

  if (arg === '--keywords') {
    const value = args[index + 1];
    keywords = parseKeywordsArg(value);
    index += 1;
    continue;
  }

  positionalArgs.push(arg);
}

const subreddit = positionalArgs[0] ?? 'smallbusiness';

runIngestionSources({
  subreddit,
  ...(keywords ? { discoveryKeywords: keywords } : {})
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error('Ingestion run failed', error);
    process.exitCode = 1;
  });
