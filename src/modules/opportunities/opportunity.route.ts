import type { FastifyPluginAsync } from 'fastify';

import { getOpportunityPage, hideOpportunity } from './opportunity.service.js';

export const registerOpportunityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/opportunities', async (request) => {
    const query = request.query as { limit?: string; page?: string } | undefined;
    const limit = query?.limit ? Number(query.limit) : undefined;
    const page = query?.page ? Number(query.page) : undefined;

    return getOpportunityPage(
      Number.isFinite(limit) ? limit : 5,
      Number.isFinite(page) ? page : 1
    );
  });

  app.post('/opportunities/:opportunityId/ignore', async (request, reply) => {
    const params = request.params as { opportunityId: string };
    await hideOpportunity(Number(params.opportunityId));
    return reply.code(204).send();
  });
};
