import type { FastifyInstance } from 'fastify';

import type { AppEnvironment } from '../config/environment.js';
import type { DatabaseHandle } from '../database/database.js';
import { applicationJobHandlers, applicationRecurringJobs } from '../job-definitions.js';
import { applicationOutboxEvents } from '../outbox-event-definitions.js';
import {
  createAccessControlModule,
  createAccessControlService,
  installAccessControlGuard,
} from './access-control/public.js';
import { createHealthModule } from './health/plugin.js';
import { createIdentityModule, createIdentityService } from './identity/plugin.js';
import { createAuditModule, createAuditService } from './audit/public.js';
import { createSettingsModule, createSettingsService } from './settings/public.js';
import { createIdempotencyModule, createIdempotencyService } from './idempotency/public.js';
import { createJobsModule, createJobsService } from './jobs/public.js';
import { createOutboxModule, createOutboxService } from './outbox/public.js';

export interface ApplicationModuleDependencies {
  environment: AppEnvironment;
  database: DatabaseHandle;
}

export async function registerApplicationModules(
  app: FastifyInstance,
  dependencies: ApplicationModuleDependencies,
): Promise<void> {
  const audit = createAuditService({ database: dependencies.database });
  const identity = createIdentityService({ ...dependencies, audit });
  const access = createAccessControlService({ database: dependencies.database, identity, audit });
  const settings = createSettingsService({ ...dependencies, audit });
  const idempotency = createIdempotencyService(dependencies);
  const jobs = createJobsService({
    database: dependencies.database,
    audit,
    handlers: applicationJobHandlers,
    recurringJobs: applicationRecurringJobs,
  });
  const outbox = createOutboxService({
    database: dependencies.database,
    audit,
    events: applicationOutboxEvents,
  });
  installAccessControlGuard(app, { environment: dependencies.environment, identity, access });
  await app.register(createHealthModule(dependencies));
  await app.register(createIdentityModule({ ...dependencies, audit, service: identity }));
  await app.register(
    createAccessControlModule({
      database: dependencies.database,
      identity,
      audit,
      service: access,
    }),
  );
  await app.register(createAuditModule({ database: dependencies.database, service: audit }));
  await app.register(
    createSettingsModule({
      ...dependencies,
      audit,
      registry: settings.registry,
      service: settings.service,
    }),
  );
  await app.register(
    createIdempotencyModule({ database: dependencies.database, service: idempotency }),
  );
  await app.register(
    createJobsModule({ database: dependencies.database, audit, service: jobs.service }),
  );
  await app.register(
    createOutboxModule({
      database: dependencies.database,
      audit,
      service: outbox.service,
      adminService: outbox.adminService,
    }),
  );
}
