import { createNotificationsApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const notificationsApi = createNotificationsApi(appApiClient);
