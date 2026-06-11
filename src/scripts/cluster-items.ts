import { buildProblemClusters } from '../modules/clustering/clustering.service.js';

buildProblemClusters()
	.then((result) => {
		console.log(JSON.stringify(result, null, 2));
	})
	.catch((error: unknown) => {
		console.error('Clustering job failed', error);
		process.exitCode = 1;
	});