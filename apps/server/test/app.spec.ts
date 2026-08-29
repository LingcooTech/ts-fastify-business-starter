import { ApiError } from '@lingcoo-tech/http';

import { buildApp } from '../src/app.js';
import type { AppEnvironment } from '../src/config/environment.js';
import type { DatabaseHandle } from '../src/database/database.js';

const environment: AppEnvironment = {
  NODE_ENV: 'test',
  APP_NAME: 'starter-test',
  APP_VERSION: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 8090,
  CORS_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgres://test:test@127.0.0.1:5438/test',
  API_DOCS_ENABLED: false,
  TRUST_PROXY: false,
  LOG_LEVEL: 'silent',
};

function fakeDatabase(options: { pingError?: Error } = {}) {
  let closed = false;
  const database = {
    db: {} as DatabaseHandle['db'],
    async transaction<T>(work: Parameters<DatabaseHandle['transaction']>[0]) {
      return work({} as Parameters<typeof work>[0]) as Promise<T>;
    },
    async ping() {
      if (options.pingError) throw options.pingError;
    },
    async close() {
      closed = true;
    },
  } satisfies DatabaseHandle;
  return { database, wasClosed: () => closed };
}

describe('application', () => {
  it('reports liveness and readiness with a request ID', async () => {
    const { database, wasClosed } = fakeDatabase();
    const app = await buildApp({ environment, database });

    const live = await app.inject({ method: 'GET', url: '/health/live' });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toMatchObject({ status: 'ok', info: { api: { status: 'up' } } });
    expect(live.headers['x-request-id']).toBeTruthy();

    const ready = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: 'ok', info: { database: { status: 'up' } } });

    await app.close();
    expect(wasClosed()).toBe(true);
  });

  it('reports an unavailable database without failing liveness', async () => {
    const { database } = fakeDatabase({ pingError: new Error('database unavailable') });
    const app = await buildApp({ environment, database });

    const ready = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(ready.statusCode).toBe(503);
    expect(ready.json()).toEqual({
      status: 'error',
      error: { database: { status: 'down' } },
    });

    const live = await app.inject({ method: 'GET', url: '/health/live' });
    expect(live.statusCode).toBe(200);
    await app.close();
  });

  it('returns stable validation and application error contracts', async () => {
    const { database } = fakeDatabase();
    const app = await buildApp({ environment, database });
    app.post(
      '/api/example',
      {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            additionalProperties: false,
            properties: { name: { type: 'string', minLength: 1 } },
          },
        },
      },
      async (request) => request.body,
    );
    app.get('/api/conflict', async () => {
      throw new ApiError(409, 'EXAMPLE_CONFLICT', 'Example conflict');
    });

    const invalid = await app.inject({ method: 'POST', url: '/api/example', payload: {} });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
    });
    expect(invalid.json().error.requestId).toBeTruthy();

    const conflict = await app.inject({ method: 'GET', url: '/api/conflict' });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      error: { code: 'EXAMPLE_CONFLICT', message: 'Example conflict' },
    });
    await app.close();
  });
});
