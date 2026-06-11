CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id BIGSERIAL PRIMARY KEY,
  status TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  progress_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  result_json JSONB,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_created_at ON pipeline_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_jobs(status, created_at DESC);
