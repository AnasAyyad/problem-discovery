import { embedPendingSourceItems } from '../modules/embeddings/embeddings.service.js';

embedPendingSourceItems()
	.then((result) => {
		console.log(JSON.stringify(result, null, 2));
	})
	.catch((error: unknown) => {
		console.error('Embedding job failed', error);
		process.exitCode = 1;
	});