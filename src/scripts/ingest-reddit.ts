import { ingestRedditHot } from '../modules/ingestion/reddit/reddit.ingest.js';

const subreddit = process.argv[2] ?? 'smallbusiness';

ingestRedditHot(subreddit)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error('Reddit ingestion failed', error);
    process.exitCode = 1;
  });