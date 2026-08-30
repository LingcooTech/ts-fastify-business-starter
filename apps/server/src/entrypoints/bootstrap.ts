import 'dotenv/config';

import { passwordSchema } from '@ts-fastify-business-starter/contracts';

import { validateEnvironment } from '../config/environment.js';
import { createDatabase } from '../database/database.js';
import { createAccessControlService } from '../modules/access-control/public.js';
import { createIdentityService } from '../modules/identity/public.js';

const environment = validateEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);

try {
  const identity = createIdentityService({ database, environment });
  const access = createAccessControlService({ database, identity });
  await access.synchronizeSystemAccess();
  if (!environment.BOOTSTRAP_OWNER_EMAIL || !environment.BOOTSTRAP_OWNER_PASSWORD) {
    console.info(
      'Access catalog ready; bootstrap account skipped because credentials are not configured',
    );
  } else {
    const user = await identity.ensureBootstrapUser(
      environment.BOOTSTRAP_OWNER_EMAIL,
      passwordSchema.parse(environment.BOOTSTRAP_OWNER_PASSWORD),
    );
    if (user.status !== 'active') throw new Error('Configured bootstrap account is disabled');
    await access.assignOwner(user.id);
    console.info(`Bootstrap account ready: ${user.email}`);
  }
} finally {
  await database.close();
}
