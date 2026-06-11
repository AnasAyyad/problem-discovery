import type { FastifyPluginAsync } from 'fastify';

import { getOpportunities } from './opportunity.service.js';

export const registerOpportunityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/opportunities', async (request) => {
    const query = request.query as { limit?: string } | undefined;
    const limit = query?.limit ? Number(query.limit) : undefined;

    return {
      items: await getOpportunities(Number.isFinite(limit) ? limit : undefined)
    };
  });
};
