// This file is the Drizzle composition point. Tables remain owned by their module.
export * from '../modules/identity/infrastructure/persistence/identity.schema.js';
export * from '../modules/access-control/infrastructure/persistence/access-control.schema.js';
export * from '../modules/audit/infrastructure/persistence/audit.schema.js';
export * from '../modules/settings/infrastructure/persistence/settings.schema.js';
export * from '../modules/idempotency/infrastructure/persistence/idempotency.schema.js';
export * from '../modules/jobs/infrastructure/persistence/jobs.schema.js';
