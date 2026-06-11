ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS ignored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_opportunities_ignored_at ON opportunities(ignored_at, inserted_at DESC);
