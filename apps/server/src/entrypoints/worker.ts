import 'dotenv/config';

import pino from 'pino';

import { validateEnvironment } from '../config/environment.js';
import { createDatabase } from '../database/database.js';

const environment = validateEnvironment(process.env);
const logger = pino({ level: environment.LOG_LEVEL }).child({
  app: environment.APP_NAME,
  process: 'worker',
  version: environment.APP_VERSION,
});
const database = createDatabase(environment.DATABASE_URL);

await database.ping();
logger.info('worker ready; register application job runners here');

await new Promise<void>((resolveShutdown) => {
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down worker');
    resolveShutdown();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
});

await database.close();
