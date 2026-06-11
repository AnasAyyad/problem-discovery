import { runPipeline } from '../modules/pipeline/pipeline.service.js';

const subreddit = process.argv[2] ?? 'smallbusiness';

runPipeline({ subreddit })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error('Pipeline run failed', error);
    process.exitCode = 1;
  });