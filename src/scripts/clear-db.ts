import { closePool, pool } from "../db/pool.js";

const tables = [
  "source_item_embeddings",
  "evidence_extractions",
  "problem_cluster_items",
  "opportunities",
  "problem_clusters",
  "pipeline_runs",
  "pipeline_jobs",
  "source_checkpoints",
  "signal_events",
  "source_items",
];

async function main(): Promise<void> {
  await pool.query(
    `TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
  );

  console.log(
    JSON.stringify(
      {
        cleared: true,
        tableCount: tables.length,
        tables,
      },
      null,
      2,
    ),
  );

  await closePool();
}

main().catch(async (error: unknown) => {
  console.error("Database clear failed", error);
  await closePool();
  process.exitCode = 1;
});
