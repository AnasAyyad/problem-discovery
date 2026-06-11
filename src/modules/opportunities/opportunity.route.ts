import type { FastifyPluginAsync } from 'fastify';

import { getOpportunities } from './opportunity.service.js';

export const registerOpportunityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/opportunities', async () => ({
    items: await getOpportunities()
  }));
};