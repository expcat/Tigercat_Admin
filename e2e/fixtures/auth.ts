import { expect, test as base } from '@playwright/test';

export const SESSION_KEY = 'tigercat.admin.session';

/** 生成 e2e 测试数据使用的唯一后缀，避免并发或重复运行时冲突。 */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 将任意字符串转义为可安全用于 RegExp 的文本。 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type AuthFixtures = {
  loginAsAdmin: () => Promise<void>;
  logout: () => Promise<void>;
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
  logout: async ({ page }, use) => {
    await use(async () => {
      await page.getByRole('button', { name: 'admin' }).click();
      await page.getByText('退出登录').click();
      await expect(page).toHaveURL(/\/login$/);
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
