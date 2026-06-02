import { expect, SESSION_KEY, test } from './fixtures/auth';

test.describe('认证与受保护路由烟测', () => {
  test('未登录访问受保护路由时跳转到登录页', async ({ page }) => {
    await page.goto('/users');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  });

  test('登录后会话可恢复并可访问用户页', async ({
    page,
    loginAsAdmin,
    expectSessionStored,
  }) => {
    await loginAsAdmin();
    await expectSessionStored();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/users');

    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('button', { name: '新增用户' })).toBeVisible();
    await expect(page.getByText('用户管理').first()).toBeVisible();
  });

  test('退出登录后清除会话并拦截受保护路由', async ({
    page,
    loginAsAdmin,
    logout,
  }) => {
    await loginAsAdmin();

    await logout();

    await expect
      .poll(async () =>
        page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY),
      )
      .toBeNull();

    await page.goto('/users');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  });
});
