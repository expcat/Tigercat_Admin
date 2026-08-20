import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function suppressTour(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('tigercat-admin:onboarding-tour:done', '1');
    } catch {
      /* ignore storage errors */
    }
  });
}

async function login(page: Page, account: 'admin' | 'demo') {
  await suppressTour(page);
  await page.goto('/#/login');
  await page.getByPlaceholder('请输入用户名').fill(account);
  await page.getByPlaceholder('请输入密码').fill(account === 'admin' ? 'admin123' : 'demo');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
}

test.describe('异常页与路由健壮性', () => {
  test('未知路径重定向到 404，倒计时结束后自动返回首页', async ({ page }) => {
    await login(page, 'admin');

    await page.goto('/#/not-an-existing-route');
    await expect(page).toHaveURL(/#\/404$/);
    await expect(page.getByText('页面不存在')).toBeVisible();
    // 用角色定位，避免与倒计时标题「即将自动返回首页」产生文本包含歧义。
    await expect(page.getByRole('button', { name: '返回首页' })).toBeVisible();
    await expect(page.getByRole('button', { name: '返回上一页' })).toBeVisible();

    // Countdown 自动跳转（5 秒），给足余量。
    await expect(page).toHaveURL(/#\/dashboard$/, { timeout: 12_000 });
  });

  test('无权限直访受保护路由重定向到 403，可手动返回首页', async ({ page }) => {
    await login(page, 'demo');

    await page.goto('/#/users');
    await expect(page).toHaveURL(/#\/403$/);
    await expect(page.getByText('无权访问')).toBeVisible();

    await page.getByRole('button', { name: '返回首页' }).click();
    await expect(page).toHaveURL(/#\/dashboard$/);

    await page.goto('/#/roles');
    await expect(page).toHaveURL(/#\/403$/);
    await expect(page.getByText('无权访问')).toBeVisible();
  });

  test('403 与 500 异常页可独立访问', async ({ page }) => {
    await page.goto('/#/403');
    await expect(page.getByText('无权访问')).toBeVisible();
    await expect(page.getByRole('button', { name: '返回首页' })).toBeVisible();

    await page.goto('/#/500');
    await expect(page.getByText('服务异常')).toBeVisible();
    await expect(page.getByRole('button', { name: '返回上一页' })).toBeVisible();
    await expect(page.getByText('没有可返回的历史记录')).toBeVisible();
  });
});
