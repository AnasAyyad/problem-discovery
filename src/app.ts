import Fastify from 'fastify';

import { loggerOptions } from './config/logger.js';
import { registerHealthRoute } from './modules/health/health.route.js';
import { registerOpportunityRoutes } from './modules/opportunities/opportunity.route.js';
import { registerPipelineRoutes } from './modules/pipeline/pipeline.route.js';

export function buildApp() {
  const app = Fastify({
    logger: loggerOptions
  });

  void app.register(registerHealthRoute);
  void app.register(registerOpportunityRoutes);
  void app.register(registerPipelineRoutes);

  return app;
}