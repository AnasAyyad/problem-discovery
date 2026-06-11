import type { FastifyPluginAsync } from 'fastify';

import { getPipelineJobStatus, startPipelineJob } from './pipeline-job.service.js';
import { runPipeline } from './pipeline.service.js';

export const registerPipelineRoutes: FastifyPluginAsync = async (app) => {
  app.post('/pipeline/run', async (request) => {
    const body = request.body as {
      subreddit?: string;
      keywords?: string[];
      webUrls?: string[];
      ingestLimit?: number;
      embedLimit?: number;
      extractLimit?: number;
    } | undefined;

    return runPipeline({
      ...(body?.subreddit ? { subreddit: body.subreddit } : {}),
      ...(Array.isArray(body?.keywords) && body.keywords.length > 0 ? { discoveryKeywords: body.keywords } : {}),
      ...(Array.isArray(body?.webUrls) && body.webUrls.length > 0 ? { webUrls: body.webUrls } : {}),
      ...(typeof body?.ingestLimit === 'number' ? { ingestLimit: body.ingestLimit } : {}),
      ...(typeof body?.embedLimit === 'number' ? { embedLimit: body.embedLimit } : {}),
      ...(typeof body?.extractLimit === 'number' ? { extractLimit: body.extractLimit } : {})
    });
  });

  app.post('/pipeline/jobs', async (request, reply) => {
    const body = request.body as {
      keywords?: string[];
      webUrls?: string[];
      ingestLimit?: number;
      extractLimit?: number;
    } | undefined;

    const job = await startPipelineJob({
      ...(Array.isArray(body?.keywords) ? { keywords: body.keywords } : {}),
      ...(Array.isArray(body?.webUrls) ? { webUrls: body.webUrls } : {}),
      ...(typeof body?.ingestLimit === 'number' ? { ingestLimit: body.ingestLimit } : {}),
      ...(typeof body?.extractLimit === 'number' ? { extractLimit: body.extractLimit } : {})
    });

    return reply.code(202).send(job);
  });

  app.get('/pipeline/jobs/:jobId', async (request) => {
    const params = request.params as { jobId: string };
    return getPipelineJobStatus(Number(params.jobId));
  });
};
