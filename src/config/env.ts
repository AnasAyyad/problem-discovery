import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.url(),
  OLLAMA_BASE_URL: z.url().default("http://127.0.0.1:11434"),
  OLLAMA_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  OLLAMA_CHAT_MODEL: z.string().min(1),
  OLLAMA_EMBED_MODEL: z.string().min(1),
  EXTRACTION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  DISCOVERY_KEYWORDS: z
    .string()
    .default(
      "spreadsheet,manual process,inventory,reconciliation,procurement,approval workflow",
    ),
  WEB_INGEST_URLS: z.string().default(""),
  STACKEXCHANGE_KEY: z.string().optional(),
  STACKEXCHANGE_SITES: z
    .string()
    .default("stackoverflow,superuser,webapps,workplace"),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_ORGS: z.string().default(""),
  GITHUB_REPOS: z.string().default(""),
  PRODUCT_HUNT_ENABLED: z.coerce.boolean().default(false),
  PRODUCT_HUNT_TOKEN: z.string().optional(),
  GOOGLE_TRENDS_ENABLED: z.coerce.boolean().default(false),
  OPPORTUNITY_MIN_SCORE: z.coerce.number().min(0).max(100).default(60),
  OPPORTUNITY_MIN_CONFIDENCE: z.coerce.number().min(0).max(100).default(50),
  OPPORTUNITY_MIN_EVIDENCE_COUNT: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(2),
  OPPORTUNITY_MIN_SOURCE_DIVERSITY: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(2),
  CLUSTER_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.78),
  INGEST_USER_AGENT: z.string().min(1).default("hunter/0.1"),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USER_AGENT: z.string().min(1).default("hunter/0.1"),
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
