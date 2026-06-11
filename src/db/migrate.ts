import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, '../../sql');

async function runMigrationFile(fileName: string): Promise<void> {
  const sql = await readFile(path.join(sqlDir, fileName), 'utf8');
  await pool.query(sql);
}

async function main(): Promise<void> {
  await runMigrationFile('001_extensions.sql');
  await runMigrationFile('002_tables.sql');
  await runMigrationFile('003_indexes.sql');
  await runMigrationFile('004_pipeline_jobs.sql');
  await runMigrationFile('005_opportunity_ignore.sql');
  await pool.end();
}

main().catch(async (error: unknown) => {
  console.error('Migration failed', error);
  await pool.end();
  process.exitCode = 1;
});
