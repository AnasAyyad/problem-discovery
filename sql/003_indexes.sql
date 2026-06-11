CREATE INDEX IF NOT EXISTS idx_source_items_source ON source_items(source);
CREATE INDEX IF NOT EXISTS idx_source_items_inserted_at ON source_items(inserted_at DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_source_item_id ON source_item_embeddings(source_item_id);
CREATE INDEX IF NOT EXISTS idx_evidence_extractions_source_item_id ON evidence_extractions(source_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_problem_clusters_label ON problem_clusters(label);
CREATE INDEX IF NOT EXISTS idx_problem_cluster_items_source_item_id ON problem_cluster_items(source_item_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_opportunity_score ON opportunities(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_step_name ON pipeline_runs(step_name, started_at DESC);