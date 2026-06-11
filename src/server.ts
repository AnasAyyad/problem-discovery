import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';

async function main(): Promise<void> {
  const app = buildApp();

  const shutdown = async () => {
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({
    host: '0.0.0.0',
    port: env.PORT
  });
}

main().catch(async (error: unknown) => {
  console.error('Server failed to start', error);
  await closePool();
  process.exitCode = 1;
});