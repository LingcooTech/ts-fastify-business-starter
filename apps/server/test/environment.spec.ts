import { describe, expect, it } from 'vitest';

import { validateEnvironment } from '../src/config/environment.js';

const base = {
  DATABASE_URL: 'postgres://app:password@localhost:5438/app',
};

describe('identity environment', () => {
  it('requires secure cookies in production', () => {
    expect(() =>
      validateEnvironment({ ...base, NODE_ENV: 'production', AUTH_COOKIE_SECURE: 'false' }),
    ).toThrow(/AUTH_COOKIE_SECURE/);
  });

  it('never permits exposed action tokens in production', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        AUTH_COOKIE_SECURE: 'true',
        AUTH_EXPOSE_TEST_TOKENS: 'true',
      }),
    ).toThrow(/AUTH_EXPOSE_TEST_TOKENS/);
  });

  it('requires bootstrap credentials as a pair', () => {
    expect(() =>
      validateEnvironment({ ...base, BOOTSTRAP_OWNER_EMAIL: 'owner@example.com' }),
    ).toThrow(/BOOTSTRAP_OWNER_EMAIL/);
  });
});
