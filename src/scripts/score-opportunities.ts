import { materializeOpportunities } from '../modules/opportunities/opportunity.service.js';

materializeOpportunities()
	.then((result) => {
		console.log(JSON.stringify(result, null, 2));
	})
	.catch((error: unknown) => {
		console.error('Opportunity materialization failed', error);
		process.exitCode = 1;
	});