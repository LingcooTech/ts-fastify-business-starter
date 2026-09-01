import { createStorageApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const storageApi = createStorageApi(appApiClient);
