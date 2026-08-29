import type { FastifyInstance } from 'fastify';

import type { AppEnvironment } from '../config/environment.js';
import type { DatabaseHandle } from '../database/database.js';
import { createHealthModule } from './health/plugin.js';

export interface ApplicationModuleDependencies {
  environment: AppEnvironment;
  database: DatabaseHandle;
}

export async function registerApplicationModules(
  app: FastifyInstance,
  dependencies: ApplicationModuleDependencies,
): Promise<void> {
  await app.register(createHealthModule(dependencies));
}
