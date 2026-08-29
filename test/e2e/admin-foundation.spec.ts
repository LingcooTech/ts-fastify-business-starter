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
  await page.getByText('UI 基础', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'UI 基础展示' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '边界' })).toBeVisible();
});

test('supports refreshing a deep Admin route', async ({ page }) => {
  await page.goto('/admin/showcase');
  await expect(page.getByRole('heading', { name: 'UI 基础展示' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'UI 基础展示' })).toBeVisible();
});
