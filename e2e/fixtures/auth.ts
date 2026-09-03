import { expect, test as base, type Page } from '@playwright/test';

export const SESSION_KEY = 'tigercat.admin.session';
const TOUR_DONE_KEY = 'tigercat-admin:onboarding-tour:done';

/** 抑制首次登录新手引导，避免 Tour 遮罩拦截后续点击。 */
export async function suppressOnboardingTour(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore storage errors */
    }
  }, TOUR_DONE_KEY);
}

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
  page: async ({ page }, use) => {
    await suppressOnboardingTour(page);
    await use(page);
  },
  loginAsAdmin: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login');
      const usernameInput = page.getByRole('textbox', { name: '用户名' });
      const passwordInput = page.getByRole('textbox', { name: '密码' });

      await usernameInput.fill('admin');
      await expect(usernameInput).toHaveValue('admin');
      await passwordInput.fill('admin123');
      await expect(passwordInput).toHaveValue('admin123');
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });
  },
  logout: async ({ page }, use) => {
    await use(async () => {
      await page.getByRole('banner').getByRole('button', { name: 'admin', exact: true }).click();
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
