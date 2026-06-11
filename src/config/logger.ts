import type { FastifyServerOptions } from 'fastify';

import { env } from './env.js';

const baseLogger = {
  level: env.LOG_LEVEL
};

export const loggerOptions: NonNullable<FastifyServerOptions['logger']> = env.NODE_ENV === 'development'
  ? {
      ...baseLogger,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard'
        }
      }
    }
  : baseLogger;