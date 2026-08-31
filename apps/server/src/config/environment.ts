import { z } from 'zod';

export const DEVELOPMENT_SETTINGS_KEY = 'development-only-settings-key-change-me';

const settingsKeyringSchema = z
  .string()
  .default(JSON.stringify({ development: DEVELOPMENT_SETTINGS_KEY }))
  .transform((value, context): unknown => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({ code: 'custom', message: '必须是 Key ID 到密钥的 JSON 对象' });
      return z.NEVER;
    }
  })
  .pipe(z.record(z.string().trim().min(1).max(120), z.string().min(32)));

const optionalEnvironmentValue = <T extends z.ZodType>(schema: T) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((value): z.output<T> | undefined => (value === '' ? undefined : value));

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().trim().min(1).default('ts-fastify-business-starter'),
    APP_VERSION: z.string().trim().min(1).default('development'),
    API_HOST: z.string().trim().min(1).default('0.0.0.0'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(8090),
    CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
    DATABASE_URL: z.string().url(),
    API_DOCS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    JOBS_WORKER_ID: optionalEnvironmentValue(
      z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9._:@/-]+$/)
        .max(200),
    ),
    JOBS_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
    JOBS_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
    JOBS_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(250).max(300_000).default(10_000),
    JOBS_SHUTDOWN_GRACE_MS: z.coerce.number().int().min(1_000).max(300_000).default(30_000),
    JOBS_STALE_RECOVERY_BATCH: z.coerce.number().int().min(1).max(1_000).default(100),
    JOBS_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    JOBS_MAINTENANCE_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .max(86_400_000)
      .default(3_600_000),
    AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(2_592_000).default(604_800),
    AUTH_ACTION_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(3600),
    AUTH_COOKIE_NAME: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .default('app_session'),
    AUTH_CSRF_COOKIE_NAME: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .default('app_csrf'),
    AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    AUTH_COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    AUTH_EXPOSE_TEST_TOKENS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SETTINGS_ENCRYPTION_CURRENT_KEY_ID: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._-]+$/)
      .max(120)
      .default('development'),
    SETTINGS_ENCRYPTION_KEYS: settingsKeyringSchema,
    SUPPORT_EMAIL: optionalEnvironmentValue(
      z.string().trim().toLowerCase().pipe(z.email().max(320)),
    ),
    BOOTSTRAP_OWNER_EMAIL: z
      .union([z.literal(''), z.string().trim().toLowerCase().pipe(z.email().max(320))])
      .optional()
      .transform((value) => value || undefined),
    BOOTSTRAP_OWNER_PASSWORD: z
      .union([z.literal(''), z.string().min(12).max(128)])
      .optional()
      .transform((value) => value || undefined),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && !value.AUTH_COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_COOKIE_SECURE'],
        message: 'must be true in production',
      });
    }
    if (value.NODE_ENV === 'production' && value.AUTH_EXPOSE_TEST_TOKENS) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_EXPOSE_TEST_TOKENS'],
        message: 'must be false in production',
      });
    }
    if (value.AUTH_COOKIE_SAME_SITE === 'none' && !value.AUTH_COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_COOKIE_SAME_SITE'],
        message: 'none requires secure cookies',
      });
    }
    if (Boolean(value.BOOTSTRAP_OWNER_EMAIL) !== Boolean(value.BOOTSTRAP_OWNER_PASSWORD)) {
      context.addIssue({
        code: 'custom',
        path: ['BOOTSTRAP_OWNER_EMAIL'],
        message: 'email and password must be provided together',
      });
    }
    if (!value.SETTINGS_ENCRYPTION_KEYS[value.SETTINGS_ENCRYPTION_CURRENT_KEY_ID]) {
      context.addIssue({
        code: 'custom',
        path: ['SETTINGS_ENCRYPTION_CURRENT_KEY_ID'],
        message: '必须指向 SETTINGS_ENCRYPTION_KEYS 中存在的 Key ID',
      });
    }
    if (
      value.NODE_ENV === 'production' &&
      Object.values(value.SETTINGS_ENCRYPTION_KEYS).includes(DEVELOPMENT_SETTINGS_KEY)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SETTINGS_ENCRYPTION_KEYS'],
        message: '生产环境不能使用默认开发密钥',
      });
    }
  });

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function validateEnvironment(values: Record<string, unknown>): AppEnvironment {
  const result = environmentSchema.safeParse(values);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
