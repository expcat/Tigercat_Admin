import { expect, SESSION_KEY, test } from './fixtures/auth';

test.describe('认证与受保护路由烟测', () => {
  test('未登录访问受保护路由时跳转到登录页', async ({ page }) => {
    await page.goto('/users');

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
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

  test('登录后返回原目标页', async ({ page, expectSessionStored }) => {
    await page.goto('/roles');

    await expect(page).toHaveURL(/\/login/);

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page).toHaveURL(/\/roles$/);
    await expectSessionStored();
    await expect(page.getByText('角色管理').first()).toBeVisible();
  });

  test('会话过期后提示并在重新登录后返回原目标页', async ({
    page,
    expectSessionStored,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          token: 'expired-token',
          username: 'admin',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      );
    }, SESSION_KEY);

    await page.goto('/users');

    await expect(page.getByText('会话已过期，请重新登录').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect
      .poll(async () =>
        page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY),
      )
      .toBeNull();

    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page).toHaveURL(/\/users$/);
    await expectSessionStored();
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
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  });

  test('跨标签页退出后同步回到登录页', async ({ page, loginAsAdmin, logout }) => {
    await loginAsAdmin();

    const secondPage = await page.context().newPage();
    await secondPage.goto('/users');
    await expect(secondPage).toHaveURL(/\/users$/);

    await logout();

    await expect(secondPage).toHaveURL(/\/login$/);
    await expect(secondPage.getByRole('heading', { name: '欢迎回来' })).toBeVisible();

    await secondPage.close();
  });
});
