import { createJobsApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const jobsApi = createJobsApi(appApiClient);
