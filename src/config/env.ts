import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  OLLAMA_BASE_URL: z.url().default('http://127.0.0.1:11434'),
  OLLAMA_CHAT_MODEL: z.string().min(1),
  OLLAMA_EMBED_MODEL: z.string().min(1),
  EXTRACTION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  INGEST_USER_AGENT: z.string().min(1).default('hunter/0.1'),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USER_AGENT: z.string().min(1).default('hunter/0.1')
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
