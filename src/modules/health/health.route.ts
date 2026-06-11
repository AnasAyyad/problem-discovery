import type { FastifyPluginAsync } from 'fastify';

import { env } from '../../config/env.js';

export const registerHealthRoute: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    status: 'ok',
    env: env.NODE_ENV
  }));
};