import { expect, test as base } from '@playwright/test';

const SESSION_KEY = 'tigercat.admin.session';

type AuthFixtures = {
  loginAsAdmin: () => Promise<void>;
  expectSessionStored: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  loginAsAdmin: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login');
      await page.getByPlaceholder('请输入用户名').fill('admin');
      await page.getByPlaceholder('请输入密码').fill('admin123');
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });
  },
  expectSessionStored: async ({ page }, use) => {
    await use(async () => {
      await expect
        .poll(async () =>
          page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY),
        )
        .not.toBeNull();
    });
  },
});

export { expect };
