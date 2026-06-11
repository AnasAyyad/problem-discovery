import { extractPendingSourceItems } from '../modules/extraction/extraction.service.js';

extractPendingSourceItems()
	.then((result) => {
		console.log(JSON.stringify(result, null, 2));
	})
	.catch((error: unknown) => {
		console.error('Extraction job failed', error);
		process.exitCode = 1;
	});