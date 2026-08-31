import { expect, test, type Page } from '@playwright/test';

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/health/ready', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', info: { database: { status: 'up' } } }),
    });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '7f4cc774-403b-4d44-8c43-8f2fb26f0a85',
          email: 'owner@example.com',
          displayName: 'Bootstrap Owner',
          status: 'active',
          emailVerifiedAt: '2026-08-30T00:00:00.000Z',
          createdAt: '2026-08-30T00:00:00.000Z',
        },
        session: {
          id: '67f6711f-cebd-4035-9873-29bcd06f705f',
          expiresAt: '2026-09-06T00:00:00.000Z',
        },
        csrfToken: 'abcdefghijklmnopqrstuvwxyz123456',
      }),
    });
  });
  await page.route('**/api/access/permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        permissions: [
          'accounts.read',
          'accounts.manage',
          'roles.read',
          'roles.manage',
          'audit.read',
          'settings.read',
          'settings.manage',
          'idempotency.read',
        ],
      }),
    });
  });
  await page.route('**/api/access/catalog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            key: 'accounts.read',
            source: 'core',
            group: '访问控制',
            name: '查看账号',
            description: '查看后台账号及其角色。',
          },
          {
            key: 'roles.read',
            source: 'core',
            group: '访问控制',
            name: '查看角色',
            description: '查看角色和权限目录。',
          },
        ],
      }),
    });
  });
  await page.route('**/api/access/roles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: '8b2082fd-c5c7-48d5-9d4d-aa415473b357',
            key: 'system.owner',
            name: 'Owner',
            description: '系统所有者',
            system: true,
            permissionCount: 15,
            userCount: 1,
            createdAt: '2026-08-30T00:00:00.000Z',
            updatedAt: '2026-08-30T00:00:00.000Z',
          },
        ],
      }),
    });
  });
  await page.route('**/api/access/users**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: '7f4cc774-403b-4d44-8c43-8f2fb26f0a85',
            email: 'owner@example.com',
            displayName: 'Bootstrap Owner',
            status: 'active',
            emailVerifiedAt: '2026-08-30T00:00:00.000Z',
            createdAt: '2026-08-30T00:00:00.000Z',
            roles: [
              {
                id: '8b2082fd-c5c7-48d5-9d4d-aa415473b357',
                key: 'system.owner',
                name: 'Owner',
                system: true,
              },
            ],
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      }),
    });
  });
  await page.route('**/api/audit/events**', async (route) => {
    const event = {
      id: '0b84525e-a74f-4fc9-af28-4602bf0b305f',
      occurredAt: '2026-08-30T08:00:00.000Z',
      eventVersion: 1,
      redactionVersion: 1,
      category: 'access',
      actorType: 'user',
      actorId: '7f4cc774-403b-4d44-8c43-8f2fb26f0a85',
      actorLabel: 'Bootstrap Owner',
      action: 'access.role.created',
      resourceType: 'access.role',
      resourceId: '8b2082fd-c5c7-48d5-9d4d-aa415473b357',
      outcome: 'success',
      requestId: 'audit-e2e-request',
      correlationId: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright',
      changes: [{ field: 'name', before: null, after: 'Owner' }],
      metadata: {},
    };
    const detail = new URL(route.request().url()).pathname.endsWith(event.id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail ? event : { items: [event], page: 1, pageSize: 20, total: 1 }),
    });
  });
  await page.route('**/api/idempotency/records**', async (route) => {
    const record = {
      id: '6f54dd84-ca70-4d17-bf80-ffaca336113c',
      scope: 'account:7f4cc774-403b-4d44-8c43-8f2fb26f0a85',
      operation: 'orders.create',
      keyPreview: 'orde…88b592fc',
      status: 'succeeded',
      attemptCount: 2,
      maxAttempts: 3,
      recoveryCount: 1,
      actorId: '7f4cc774-403b-4d44-8c43-8f2fb26f0a85',
      lockedUntil: null,
      expiresAt: '2026-09-07T08:00:00.000Z',
      createdAt: '2026-08-31T08:00:00.000Z',
      updatedAt: '2026-08-31T08:01:00.000Z',
      completedAt: '2026-08-31T08:01:00.000Z',
    };
    const detail = new URL(route.request().url()).pathname.endsWith(record.id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        detail
          ? {
              ...record,
              requestHash: 'a'.repeat(64),
              requestHashVersion: 1,
              resultStored: true,
              resultSizeBytes: 48,
              lastError: null,
            }
          : { items: [record], page: 1, pageSize: 20, total: 1 },
      ),
    });
  });
  let localeSource: 'default' | 'database' = 'default';
  let localeVersion: number | null = null;
  let localeValue = 'zh-CN';
  await page.route('**/api/settings**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const setting = (input: {
      key: string;
      label: string;
      description: string;
      kind: 'public' | 'internal' | 'secret';
      control: 'text' | 'email' | 'url' | 'number' | 'boolean' | 'select';
      source: 'environment' | 'database' | 'default' | 'unset';
      configured: boolean;
      readOnly: boolean;
      version: number | null;
      value?: unknown;
      options?: Array<{ label: string; value: string | number }>;
    }) => ({
      group: input.key.startsWith('application.') ? 'application' : 'integrations',
      groupLabel: input.key.startsWith('application.') ? '应用信息' : '扩展能力',
      options: [],
      updatedAt: null,
      updatedBy: null,
      ...input,
    });

    if (request.method() === 'GET' && url.pathname === '/api/settings') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            setting({
              key: 'application.name',
              label: '应用名称',
              description: '用于管理后台和公共页面的应用名称。',
              kind: 'public',
              control: 'text',
              source: 'environment',
              configured: true,
              readOnly: true,
              version: null,
              value: 'Business Starter',
            }),
            setting({
              key: 'application.locale',
              label: '默认语言',
              description: '页面和通知使用的默认语言。',
              kind: 'public',
              control: 'select',
              source: localeSource,
              configured: true,
              readOnly: false,
              version: localeVersion,
              value: localeValue,
              options: [
                { label: '简体中文', value: 'zh-CN' },
                { label: 'English', value: 'en-US' },
              ],
            }),
            setting({
              key: 'integrations.api-token',
              label: 'API Token',
              description: '验证敏感设置通用编辑能力。',
              kind: 'secret',
              control: 'text',
              source: 'database',
              configured: true,
              readOnly: false,
              version: 3,
            }),
          ],
          connectionTests: [
            {
              key: 'integrations.api-health',
              group: 'integrations',
              label: 'API 连接',
              description: '验证外部 API 可用性。',
              requiredSettings: ['integrations.api-token'],
            },
          ],
        }),
      });
      return;
    }
    if (request.method() === 'PUT' && url.pathname === '/api/settings/application.locale') {
      const payload = request.postDataJSON() as { value: string; expectedVersion: number | null };
      if (payload.expectedVersion !== localeVersion) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'SETTING_VERSION_CONFLICT', message: '设置已被修改' },
          }),
        });
        return;
      }
      localeSource = 'database';
      localeVersion = (localeVersion ?? 0) + 1;
      localeValue = payload.value;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          setting({
            key: 'application.locale',
            label: '默认语言',
            description: '页面和通知使用的默认语言。',
            kind: 'public',
            control: 'select',
            source: localeSource,
            configured: true,
            readOnly: false,
            version: localeVersion,
            value: localeValue,
            options: [
              { label: '简体中文', value: 'zh-CN' },
              { label: 'English', value: 'en-US' },
            ],
          }),
        ),
      });
      return;
    }
    if (
      request.method() === 'POST' &&
      url.pathname === '/api/settings/tests/integrations.api-health'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          message: '连接正常',
          testedAt: '2026-08-31T00:00:00.000Z',
        }),
      });
      return;
    }
    if (request.method() === 'POST' && url.pathname === '/api/settings/actions/rotate-secrets') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rotated: 1 }),
      });
      return;
    }
    await route.fallback();
  });
});

test('redirects an unauthenticated visitor to the login page', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'AUTHENTICATION_REQUIRED', message: '请先登录' },
      }),
    });
  });
  await page.goto('/admin/');

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: '登录管理后台' })).toBeVisible();
  await expect(page.getByLabel('邮箱')).toBeVisible();
  await expect(page.getByLabel('密码')).toBeVisible();
  expect(browserErrors.get(page)).toEqual([
    'Failed to load resource: the server responded with a status of 401 (Unauthorized)',
  ]);
  browserErrors.set(page, []);
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

test('renders the Admin foundation and navigates to the showcase', async ({ page }) => {
  await page.goto('/admin/');

  await expect(page.getByRole('heading', { name: '工程基础' })).toBeVisible();
  await expect(page.getByText('运行正常')).toBeVisible();

  if (page.viewportSize() && page.viewportSize()!.width < 992) {
    await page.getByRole('button', { name: '打开导航' }).click();
  }
  await page.getByRole('menuitem', { name: /UI 基础/ }).click();
  await expect(page.getByRole('heading', { name: 'UI 基础展示' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('columnheader', { name: '边界' })).toBeVisible();
});

test('supports refreshing a deep Admin route', async ({ page }) => {
  await page.goto('/admin/showcase');
  await expect(page.getByRole('heading', { name: 'UI 基础展示' })).toBeVisible({
    timeout: 20_000,
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'UI 基础展示' })).toBeVisible({
    timeout: 20_000,
  });
});

test('renders role and account management as complete permission-aware pages', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/admin/access/roles');
  await expect(page.getByRole('heading', { name: '角色与权限' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Owner', { exact: true })).toBeVisible();
  await expect(page.getByText('系统角色', { exact: true })).toBeVisible();

  await page.goto('/admin/access/users');
  await expect(page.getByRole('heading', { name: '账号管理' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('owner@example.com')).toBeVisible();
  await expect(page.getByText('正常', { exact: true })).toBeVisible();
});

test('renders searchable audit logs and a read-only event detail', async ({ page }) => {
  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { name: '审计日志' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('access.role.created', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '详情' }).click({ force: true });
  const detail = page.locator('.audit-detail-drawer');
  await expect(detail).toBeVisible();
  await expect(detail.getByText('audit-e2e-request', { exact: true })).toBeVisible();
  await expect(detail.getByText('变更摘要', { exact: true })).toBeVisible();
});

test('manages settings with source visibility, secret protection, and connection tests', async ({
  page,
}) => {
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible({ timeout: 20_000 });
  const applicationName = page.locator('[data-setting-key="application.name"]');
  await expect(applicationName.getByText('环境变量', { exact: true })).toBeVisible();
  await expect(applicationName.getByText('请在部署环境中修改')).toBeVisible();
  await expect(applicationName.getByRole('button', { name: '保存' })).toHaveCount(0);

  const locale = page.locator('[data-setting-key="application.locale"]');
  await locale.locator('.ant-select').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await locale.getByRole('button', { name: '保存' }).click();
  await expect(locale.getByText('管理后台', { exact: true })).toBeVisible();
  await expect(locale.getByRole('button', { name: '恢复默认来源' })).toBeVisible();

  const secret = page.locator('[data-setting-key="integrations.api-token"]');
  await expect(secret.getByText('敏感', { exact: true })).toBeVisible();
  await expect(secret.getByPlaceholder('已配置；输入完整新值以替换')).toHaveValue('');

  await page.getByRole('button', { name: '测试连接' }).click();
  await expect(page.getByText('连接正常')).toBeVisible();
});

test('renders read-only idempotency diagnostics without exposing stored results', async ({
  page,
}) => {
  await page.goto('/admin/idempotency');
  await expect(page.getByRole('heading', { name: '幂等诊断' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('orders.create', { exact: true })).toBeVisible();
  await expect(page.getByText('已成功', { exact: true })).toBeVisible();
  await expect(page.getByText('诊断页不提供强制成功、删除或重新执行操作')).toBeVisible();

  await page.getByRole('button', { name: '详情' }).click({ force: true });
  const detail = page.getByRole('dialog', { name: '幂等记录详情' });
  await expect(detail).toBeVisible();
  await expect(detail.getByText('Request Hash v1', { exact: true })).toBeVisible();
  await expect(detail.getByText(/已安全保存（48 bytes），不通过诊断 API 展示/)).toBeVisible();
  await expect(detail.getByRole('button', { name: /删除|重试|强制成功/ })).toHaveCount(0);
});

test('hides protected navigation when the account has no matching permission', async ({ page }) => {
  await page.route('**/api/access/permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ permissions: [] }),
    });
  });
  await page.goto('/admin/');
  if (page.viewportSize() && page.viewportSize()!.width < 992) {
    await page.getByRole('button', { name: '打开导航' }).click();
  }
  await expect(page.getByRole('menuitem', { name: /账号管理/ })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /角色与权限/ })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /审计日志/ })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /系统设置/ })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: /幂等诊断/ })).toHaveCount(0);
});
