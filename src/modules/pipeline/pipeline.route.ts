import type { FastifyPluginAsync } from 'fastify';

import { runPipeline } from './pipeline.service.js';

export const registerPipelineRoutes: FastifyPluginAsync = async (app) => {
  app.post('/pipeline/run', async (request) => {
    const body = request.body as { subreddit?: string } | undefined;
    return body?.subreddit
      ? runPipeline({ subreddit: body.subreddit })
      : runPipeline();
  });
};