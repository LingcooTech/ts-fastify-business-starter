import { createAccessControlApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const accessApi = createAccessControlApi(appApiClient);
