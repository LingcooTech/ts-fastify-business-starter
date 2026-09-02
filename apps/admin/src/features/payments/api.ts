import { createPaymentsApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const paymentsApi = createPaymentsApi(appApiClient);
