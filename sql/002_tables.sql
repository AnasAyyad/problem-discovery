CREATE TABLE IF NOT EXISTS source_items (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ,
  normalized_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, external_id),
  UNIQUE (source, content_hash)
);

CREATE TABLE IF NOT EXISTS source_item_embeddings (
  id BIGSERIAL PRIMARY KEY,
  source_item_id BIGINT NOT NULL REFERENCES source_items(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  embedding VECTOR(768) NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_item_id, model_name)
);

CREATE TABLE IF NOT EXISTS evidence_extractions (
  id BIGSERIAL PRIMARY KEY,
  source_item_id BIGINT NOT NULL REFERENCES source_items(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  extracted_json JSONB NOT NULL,
  confidence_score NUMERIC(5, 2) NOT NULL,
  parse_success BOOLEAN NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problem_clusters (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  summary TEXT,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'candidate',
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problem_cluster_items (
  cluster_id BIGINT NOT NULL REFERENCES problem_clusters(id) ON DELETE CASCADE,
  source_item_id BIGINT NOT NULL REFERENCES source_items(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5, 4) NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cluster_id, source_item_id)
);

CREATE TABLE IF NOT EXISTS opportunities (
  id BIGSERIAL PRIMARY KEY,
  cluster_id BIGINT NOT NULL REFERENCES problem_clusters(id) ON DELETE CASCADE,
  problem TEXT NOT NULL,
  target_customer TEXT NOT NULL,
  pain_description TEXT NOT NULL,
  current_workaround TEXT,
  business_impact TEXT NOT NULL,
  potential_solution TEXT NOT NULL,
  estimated_pricing TEXT,
  mvp_scope TEXT NOT NULL,
  opportunity_score NUMERIC(5, 2) NOT NULL,
  confidence_score NUMERIC(5, 2) NOT NULL,
  scoring_breakdown JSONB NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cluster_id)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id BIGSERIAL PRIMARY KEY,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  meta_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  error_text TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);