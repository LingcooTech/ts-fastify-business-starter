import { createSettingsApi } from '@ts-fastify-business-starter/api-client';

import { appApiClient } from '../identity/api';

export const settingsApi = createSettingsApi(appApiClient);
