import 'dotenv/config';

import pino from 'pino';

import { validateEnvironment } from '../config/environment.js';
import { createDatabase } from '../database/database.js';
import { applicationJobHandlers, applicationRecurringJobs } from '../job-definitions.js';
import { createJobsRunner } from '../modules/jobs/public.js';
import { createOutboxRunner } from '../modules/outbox/public.js';
import { applicationOutboxEvents } from '../outbox-event-definitions.js';
import { applicationOutboxPublishers } from '../outbox-publisher-definitions.js';

const environment = validateEnvironment(process.env);
const logger = pino({ level: environment.LOG_LEVEL }).child({
  app: environment.APP_NAME,
  process: 'worker',
  version: environment.APP_VERSION,
});
const database = createDatabase(environment.DATABASE_URL);

await database.ping();
const { runner } = createJobsRunner({
  database,
  environment,
  logger,
  handlers: applicationJobHandlers,
  recurringJobs: applicationRecurringJobs,
});
const { runner: outboxRunner } = createOutboxRunner({
  database,
  environment,
  logger,
  events: applicationOutboxEvents,
  publishers: applicationOutboxPublishers,
});
runner.start();
outboxRunner.start();

await new Promise<void>((resolveShutdown) => {
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down worker');
    resolveShutdown();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
});

await Promise.all([runner.stop(), outboxRunner.stop()]);
await database.close();
