**Plan: Local B2B Problem Discovery App**

Build one local-first TypeScript application that ingests public business complaints, preserves raw evidence, clusters recurring pain points with embeddings, extracts structured opportunity data with Ollama, and ranks opportunities with deterministic scoring. The v1 stack is Fastify + TypeScript + Postgres with pgvector + Ollama, using qwen3:8b for extraction and summarization and nomic-embed-text for embeddings. The workspace is currently empty, so this plan assumes a clean-slate build.

**Steps**

1. Phase 1: bootstrap the app skeleton in /home/anas/hunter with Node.js, TypeScript, Fastify, environment loading, logging, DB access, and a strict small-file folder structure. This blocks all later work.
2. Phase 1: add database foundations with SQL migrations for pgvector, core tables, indexes, and pipeline audit tables. Raw source storage comes first so every later step stays traceable to original evidence.
3. Phase 2: implement one source adapter only, starting with Reddit. Fetch posts/comments, normalize them into one shared source-item shape, dedupe by external ID and content hash, and store both raw payloads and normalized text.
4. Phase 2: implement embeddings generation with Ollama using nomic-embed-text. Read pending source items, generate vectors, and store them in Postgres via pgvector.
5. Phase 2: implement clustering and duplicate suppression. Group semantically similar source items into recurring complaint clusters with configurable similarity thresholds and minimum evidence counts.
6. Phase 3: implement structured extraction with qwen3:8b. Use prompt templates and Zod schemas so each complaint or small cluster is turned into validated JSON containing problem, target customer, pain description, workaround, business impact, evidence quotes, and related fields.
7. Phase 3: implement deterministic scoring in code. Compute opportunity_score and confidence_score from extracted fields plus cluster metrics. The model helps extract facts, but ranking logic stays in code.
8. Phase 3: materialize ranked opportunities. Combine cluster data, extracted evidence, pricing assumptions, MVP scope, and competition notes into stored opportunity records that always point back to real source evidence.
9. Phase 4: expose thin APIs for health, manual pipeline execution, opportunities list/detail, cluster detail, and evidence review. Route files stay thin; service files hold business logic.
10. Phase 4: add explicit local scripts for ingesting, embedding, clustering, extracting, scoring, and full pipeline runs. This avoids hidden background behavior and keeps the app easy to run on a laptop.
11. Phase 5: harden accuracy with prompt versioning, failed-extraction logging, minimum evidence thresholds, pipeline run history, and manual review fields so noisy clusters do not rise to the top.
12. Phase 5: add a second source only after Reddit works end to end. Default to plain HTTP plus HTML parsing. Add Playwright only for sources where data is hidden behind client-side rendering or interaction.

**Proposed structure**

1. Root files:
   package.json, tsconfig.json, .env.example, README.md
2. SQL:
   sql/001_extensions.sql, sql/002_tables.sql, sql/003_indexes.sql
3. Core app:
   src/app.ts, src/server.ts
4. Shared config:
   src/config/env.ts, src/config/logger.ts
5. Database:
   src/db/pool.ts, src/db/migrate.ts
6. Shared utilities:
   src/lib/errors.ts, src/lib/hash.ts, src/lib/time.ts
7. Feature modules:
   src/modules/health
   src/modules/source-items
   src/modules/ingestion
   src/modules/embeddings
   src/modules/clustering
   src/modules/extraction
   src/modules/scoring
   src/modules/opportunities
   src/modules/pipeline
8. Local commands:
   src/scripts/ingest-reddit.ts
   src/scripts/embed-pending.ts
   src/scripts/cluster-items.ts
   src/scripts/extract-evidence.ts
   src/scripts/score-opportunities.ts
   src/scripts/run-pipeline.ts
9. Tests:
   src/tests/extraction.schema.test.ts
   src/tests/scoring.rules.test.ts
   src/tests/pipeline.smoke.test.ts

**Relevant files**

- /home/anas/hunter/package.json: dependencies and local commands
- /home/anas/hunter/tsconfig.json: TypeScript compiler rules
- /home/anas/hunter/.env.example: required secrets and local configuration
- /home/anas/hunter/README.md: setup and local run flow
- /home/anas/hunter/sql/001_extensions.sql: pgvector enablement
- /home/anas/hunter/sql/002_tables.sql: source, embedding, extraction, cluster, opportunity, and pipeline tables
- /home/anas/hunter/sql/003_indexes.sql: vector and lookup indexes
- /home/anas/hunter/src/config/env.ts: validated environment loading
- /home/anas/hunter/src/db/pool.ts: Postgres connection
- /home/anas/hunter/src/modules/ingestion/reddit/reddit.client.ts: Reddit fetch logic
- /home/anas/hunter/src/modules/embeddings/embeddings.client.ts: Ollama embeddings wrapper
- /home/anas/hunter/src/modules/clustering/clustering.service.ts: grouping logic
- /home/anas/hunter/src/modules/extraction/extraction.prompts.ts: prompt versions
- /home/anas/hunter/src/modules/extraction/extraction.schema.ts: LLM JSON validation
- /home/anas/hunter/src/modules/extraction/extraction.service.ts: extraction workflow
- /home/anas/hunter/src/modules/scoring/scoring.rules.ts: deterministic weighted scoring
- /home/anas/hunter/src/modules/opportunities/opportunity.service.ts: opportunity materialization
- /home/anas/hunter/src/modules/pipeline/pipeline.service.ts: end-to-end orchestration

**Verification**

1. Confirm Postgres is running locally ( it was created by docker run -d \

   --name postgres \

   -e POSTGRES_USER=postgres \

   -e POSTGRES_PASSWORD=****\*\***** \

   -e POSTGRES_DB=hunter \

   -p 5432:5432 \

   -v postgres_data:/var/lib/postgresql/data \

postgres:latest), pgvector is enabled, Ollama is reachable, and both qwen3:8b and nomic-embed-text are available before startup. 2. Run migrations on a fresh database and verify all core tables and indexes exist. 3. Ingest a small Reddit sample and confirm raw source text, raw JSON, external IDs, and content hashes are stored correctly. 4. Generate embeddings and verify vector similarity returns meaningfully related complaints. 5. Run extraction on sample items and ensure outputs pass Zod validation; malformed outputs must be logged instead of silently accepted. 6. Verify clustering groups related complaints without collapsing unrelated posts into the same cluster. 7. Run deterministic scoring tests against fixtures and confirm score changes are explainable and stable. 8. Exercise the health, pipeline, opportunity, and cluster evidence APIs locally. 9. Run a small end-to-end smoke test from ingest through ranking and confirm top opportunities include linked evidence and reproducible scores.

**Decisions**

- Use Fastify with TypeScript, not Nest, for v1. The flow is a pipeline, so simpler structure is better than framework ceremony.
- Use one Postgres database with pgvector as the single persistence layer.
- Use Ollama locally with qwen3:8b for extraction and nomic-embed-text for embeddings.
- Keep Playwright optional and source-specific, not part of the default ingestion path.
- Keep raw source evidence immutable and make every opportunity traceable to exact sources.
- Put secrets only in local .env; commit only .env.example.
- Prefer many focused files over large multi-purpose files.
- Do not add LangChain, agents, queues, or microservices in v1.

**Why this plan is solid**
The flow is designed so the evidence layer is primary and the model layer is secondary. Raw source items are stored first, embeddings and clustering find repeated patterns, qwen extracts structured facts, and scoring happens in explicit code. That keeps the system auditable, reproducible, and easier to improve without rewriting the whole app.
