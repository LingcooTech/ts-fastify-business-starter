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
