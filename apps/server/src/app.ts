import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';

import type { AppEnvironment } from './config/environment.js';
import { createDatabase, type DatabaseHandle } from './database/database.js';
import { registerErrorHandlers } from './http/error-handler.js';
import { registerApplicationModules } from './modules/index.js';

export interface BuildAppOptions {
  environment: AppEnvironment;
  database?: DatabaseHandle;
}

function corsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { environment } = options;
  const database = options.database ?? createDatabase(environment.DATABASE_URL);
  const app = Fastify({
    logger: { level: environment.LOG_LEVEL },
    trustProxy: environment.TRUST_PROXY,
  });

  app.addHook('onClose', async () => database.close());
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  registerErrorHandlers(app);

  await app.register(cors, {
    origin: corsOrigins(environment.CORS_ORIGIN),
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: environment.API_DOCS_ENABLED ? false : undefined,
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: environment.APP_NAME,
        description: 'Application API',
        version: environment.APP_VERSION,
      },
    },
  });
  if (environment.API_DOCS_ENABLED) {
    await app.register(swaggerUi, { routePrefix: '/api/docs' });
  }

  await registerApplicationModules(app, { environment, database });

  const workspaceRoot = resolve(import.meta.dirname, '../../..');
  const adminRoot = resolve(workspaceRoot, 'apps/admin/dist');
  const webRoot = resolve(workspaceRoot, 'apps/web/dist');
  if (existsSync(adminRoot)) {
    await app.register(fastifyStatic, {
      root: adminRoot,
      prefix: '/admin/',
      wildcard: false,
    });
    app.get('/admin', async (_request, reply) => reply.redirect('/admin/'));
    app.get('/admin/*', async (_request, reply) => reply.sendFile('index.html', adminRoot));
  }
  if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot, prefix: '/', decorateReply: false });
  }

  return app;
}
