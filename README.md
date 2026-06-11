# Hunter

Local-first B2B problem discovery app that turns raw complaints into structured opportunity candidates.

## Purpose

Hunter is meant to help you discover recurring business pain worth building software for.
It collects raw source evidence, extracts structured signals with a local model, groups related pain points, and ranks the strongest opportunities for review.

## Core Idea

The app is designed around a simple research loop:

1. Ingest complaints from public sources.
2. Preserve the raw evidence.
3. Extract structured business context from each complaint.
4. Group related evidence into problem clusters.
5. Score the clusters and expose the most promising opportunities.

This keeps the workflow local-first and auditable while still using AI where it helps most: normalization and structured extraction.

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

## How It Works

### 1. Ingestion

The pipeline can ingest from multiple sources and stores each source item with metadata and the raw payload.

Current sources:

- Reddit hot posts for a target subreddit
- Hacker News search results using global discovery keywords
- Direct web pages from a configured URL list

Reddit is optional. If credentials are missing or Reddit fails, the pipeline now skips or records the failure and continues with the other sources.

### 2. Embeddings

Each source item can be embedded and stored in Postgres with pgvector. The current app keeps this foundation in place for more advanced semantic clustering.

### 3. Extraction

Ollama extracts a structured JSON record from each complaint with fields like:

- problem
- target customer
- pain description
- workaround
- business impact
- potential solution
- estimated pricing
- MVP scope

### 4. Clustering

The app groups extracted items into normalized problem clusters using a normalized problem plus target customer key.

### 5. Scoring

Each cluster is scored using a blend of:

- pain severity
- frequency / evidence volume
- business impact
- ability to pay
- reachability
- competition pressure
- MVP difficulty
- source diversity
- extraction confidence
- recency

### 6. API

The API exposes:

- `GET /health`
- `GET /opportunities`
- `POST /pipeline/run`

`GET /opportunities` now returns richer evidence context, score breakdowns, cluster evidence counts, and sample evidence links.

## Recent Enhancements

### Safer extraction retries

Extraction now stops retrying the same item forever. Items are retried only up to `EXTRACTION_MAX_ATTEMPTS` per model and prompt version.

### Better scoring inputs

Scoring now uses actual cluster context such as evidence count, source diversity, and latest evidence timestamp instead of fixed placeholder values.

### More explainable opportunities

Opportunity results now include structured details and evidence samples so the ranking is easier to inspect and trust.

### Better cluster consistency

Cluster labels are normalized before grouping, which reduces fragmentation caused by casing and punctuation differences.

### Better source consistency

Updating an existing source item now refreshes its `content_hash`, keeping deduplication metadata aligned with the current normalized text.

### More resilient ingestion

Ingestion is now source-by-source instead of all-or-nothing:

- Reddit is skipped if credentials are not configured.
- A failure in one source no longer stops the full pipeline.
- The ingest step returns per-source status so you can see what was completed, skipped, or failed.

## Current Limits

- Reddit still benefits from proper credentials for better coverage.
- Web ingestion is currently page-fetch based and works best for a curated list of URLs.
- Clustering is normalized-key based today, not true vector similarity clustering yet.
- There are still no automated tests.

## Source Configuration

### Optional Reddit credentials

If you have them:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USER_AGENT`

If you do not, the pipeline will skip Reddit and continue.

### Global discovery keywords

Use `DISCOVERY_KEYWORDS` as a comma-separated list, for example:

`DISCOVERY_KEYWORDS=spreadsheet,manual process,inventory,reconciliation,procurement`

### Direct web ingestion

Use `WEB_INGEST_URLS` as a comma-separated list, for example:

`WEB_INGEST_URLS=https://example.com/post-1,https://example.com/post-2`

## CLI Commands

### Unified ingestion

Run just the ingestion step:

```bash
npm run ingest:run
```

Optional overrides:

```bash
npm run ingest:run -- smallbusiness --keywords "spreadsheet,manual process,inventory reconciliation"
```

### Full pipeline

```bash
npm run pipeline:run
```

Optional overrides:

```bash
npm run pipeline:run -- smallbusiness --keywords "spreadsheet,manual process" --embed-limit 100 --extract-limit 50
```

## Notes

- Recommended local database image: `pgvector/pgvector:pg17`.
- The app is strongest today as an internal research assistant, not a finished end-user product.
