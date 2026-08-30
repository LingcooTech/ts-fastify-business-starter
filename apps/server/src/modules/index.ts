import type { FastifyInstance } from 'fastify';

import type { AppEnvironment } from '../config/environment.js';
import type { DatabaseHandle } from '../database/database.js';
import {
  createAccessControlModule,
  createAccessControlService,
  installAccessControlGuard,
} from './access-control/public.js';
import { createHealthModule } from './health/plugin.js';
import { createIdentityModule, createIdentityService } from './identity/plugin.js';

export interface ApplicationModuleDependencies {
  environment: AppEnvironment;
  database: DatabaseHandle;
}

export async function registerApplicationModules(
  app: FastifyInstance,
  dependencies: ApplicationModuleDependencies,
): Promise<void> {
  const identity = createIdentityService(dependencies);
  const access = createAccessControlService({ database: dependencies.database, identity });
  installAccessControlGuard(app, { environment: dependencies.environment, identity, access });
  await app.register(createHealthModule(dependencies));
  await app.register(createIdentityModule({ ...dependencies, service: identity }));
  await app.register(
    createAccessControlModule({ database: dependencies.database, identity, service: access }),
  );
}
