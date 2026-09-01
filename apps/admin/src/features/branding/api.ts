import { createBrandingApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const brandingApi = createBrandingApi(appApiClient);
