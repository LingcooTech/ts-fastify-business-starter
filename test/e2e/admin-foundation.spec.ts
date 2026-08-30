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
});
