ALTER TABLE source_items
ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'complaint',
ADD COLUMN IF NOT EXISTS matched_query TEXT,
ADD COLUMN IF NOT EXISTS source_context_json JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS source_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  checkpoint_key TEXT NOT NULL,
  checkpoint_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, checkpoint_key)
);

CREATE TABLE IF NOT EXISTS signal_events (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  signal_kind TEXT NOT NULL,
  external_id TEXT NOT NULL,
  matched_query TEXT,
  title TEXT,
  source_url TEXT,
  signal_value NUMERIC(8, 2),
  created_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_source_items_source_kind ON source_items(source_kind, inserted_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_items_matched_query ON source_items(matched_query);
CREATE INDEX IF NOT EXISTS idx_source_checkpoints_updated_at ON source_checkpoints(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_events_source ON signal_events(source, inserted_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_events_matched_query ON signal_events(matched_query);
