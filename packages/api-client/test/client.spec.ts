import { readinessResponseSchema } from '@ts-fastify-business-starter/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

describe('api client', () => {
  it('validates successful responses', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', info: { database: { status: 'up' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createApiClient({ fetch });

    await expect(
      client.request({ path: '/health/ready', schema: readinessResponseSchema }),
    ).resolves.toMatchObject({ status: 'ok' });
  });

  it('throws a typed API error', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Forbidden', requestId: 'r1' } }),
          { status: 403, headers: { 'content-type': 'application/json' } },
        ),
      );
    const client = createApiClient({ fetch });

    await expect(
      client.request({ path: '/private', schema: readinessResponseSchema }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403, requestId: 'r1' });
  });
});
