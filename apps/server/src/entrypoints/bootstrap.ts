import 'dotenv/config';

import { passwordSchema } from '@ts-fastify-business-starter/contracts';

import { validateEnvironment } from '../config/environment.js';
import { createDatabase } from '../database/database.js';
import { DisabledIdentityActionDelivery } from '../modules/identity/application/action-delivery.port.js';
import { IdentityService } from '../modules/identity/application/identity.service.js';
import { IdentityRepository } from '../modules/identity/infrastructure/persistence/identity.repository.js';

const environment = validateEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);

try {
  if (!environment.BOOTSTRAP_OWNER_EMAIL || !environment.BOOTSTRAP_OWNER_PASSWORD) {
    console.info('Bootstrap account skipped because credentials are not configured');
  } else {
    const repository = new IdentityRepository(database);
    const service = new IdentityService(
      repository,
      environment,
      new DisabledIdentityActionDelivery(),
    );
    const user = await service.ensureBootstrapUser(
      environment.BOOTSTRAP_OWNER_EMAIL,
      passwordSchema.parse(environment.BOOTSTRAP_OWNER_PASSWORD),
    );
    if (user.status !== 'active') throw new Error('Configured bootstrap account is disabled');
    console.info(`Bootstrap account ready: ${user.email}`);
  }
} finally {
  await database.close();
}
