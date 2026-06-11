import { getOpportunities } from '../modules/opportunities/opportunity.service.js';

getOpportunities()
  .then((result) => {
    console.log(JSON.stringify({ items: result }, null, 2));
  })
  .catch((error: unknown) => {
    console.error('Listing opportunities failed', error);
    process.exitCode = 1;
  });