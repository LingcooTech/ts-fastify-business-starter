import type { FastifyPluginAsync } from 'fastify';

import type { AppEnvironment } from '../../config/environment.js';
import type { DatabaseHandle } from '../../database/database.js';
import {
  DisabledIdentityActionDelivery,
  type IdentityActionDelivery,
} from './application/action-delivery.port.js';
import { IdentityService } from './application/identity.service.js';
import { registerIdentityRoutes } from './api/routes.js';
import { IdentityRepository } from './infrastructure/persistence/identity.repository.js';

export interface IdentityModuleDependencies {
  environment: AppEnvironment;
  database: DatabaseHandle;
  actionDelivery?: IdentityActionDelivery;
}

export function createIdentityModule(dependencies: IdentityModuleDependencies): FastifyPluginAsync {
  return async (app) => {
    app.decorateRequest('identityPrincipal', null);
    const repository = new IdentityRepository(dependencies.database);
    const service = new IdentityService(
      repository,
      dependencies.environment,
      dependencies.actionDelivery ?? new DisabledIdentityActionDelivery(),
    );
    await registerIdentityRoutes(app, { environment: dependencies.environment, service });
  };
}
