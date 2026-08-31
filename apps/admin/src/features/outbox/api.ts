import { createOutboxApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const outboxApi = createOutboxApi(appApiClient);
