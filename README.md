# Hunter

Local-first B2B problem discovery app.

## Stack

- Node.js + TypeScript
- Fastify
- Postgres
- Ollama

## Setup

1. Copy `.env.example` to `.env` and adjust values.
2. Install dependencies with `npm install`.
3. Ensure Postgres is running.
4. Ensure Ollama is running and the models are available.
5. For reliable Reddit ingestion, create a Reddit app and set `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`.
6. Run `npm run db:migrate`.
7. Start the API with `npm run dev`.

## Local smoke test without Reddit credentials

1. Run `npm run seed:sample`.
2. Run `npm run embed:pending`.
3. Run `npm run extract:evidence`.
4. Run `npm run score:opportunities`.
5. Run `npm run list:opportunities`.

## Notes

- Recommended local database image: `pgvector/pgvector:pg17`.
- The app keeps raw source evidence immutable and builds opportunities from derived records.