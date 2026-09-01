import { createMailApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const mailApi = createMailApi(appApiClient);
