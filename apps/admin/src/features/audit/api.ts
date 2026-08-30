import { createAuditApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const auditApi = createAuditApi(appApiClient);
