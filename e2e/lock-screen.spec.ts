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

async function login(page: Page) {
  await suppressTour(page);
  await page.goto('/#/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
}

async function inputPin(page: Page, code: string) {
  for (const digit of code.split('')) {
    await page.locator(`[data-key="${digit}"]`).click();
  }
}

test.describe('锁屏', () => {
  test('头像下拉锁定后错误 PIN 提示，正确 PIN 解锁且保持路由与多标签', async ({
    page,
  }) => {
    await login(page);

    await page.goto('/#/settings');
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expect(page.getByTestId('shell-tag-settings')).toHaveAttribute(
      'data-active',
      'true',
    );

    await page.locator('.p2-header-user-btn').click();
    await page.getByText('锁定屏幕', { exact: true }).click();

    const overlay = page.getByTestId('shell-lock-screen');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText('已锁定 · 输入 PIN 解锁')).toBeVisible();
    await expect(overlay.getByText('演示 PIN：123456')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(overlay).toBeVisible();
    await expect(page).toHaveURL(/#\/settings$/);

    await inputPin(page, '000000');
    await expect(page.getByTestId('shell-lock-error')).toBeVisible();
    await expect(page.getByText('PIN 错误，请重试')).toBeVisible();
    await expect(overlay).toBeVisible();

    await inputPin(page, '123456');
    await expect(overlay).toHaveCount(0);
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expect(page.getByTestId('shell-tag-home')).toBeVisible();
    await expect(page.getByTestId('shell-tag-settings')).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(page.getByText('系统设置').first()).toBeVisible();
  });
});
