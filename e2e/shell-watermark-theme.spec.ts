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

test.describe('全局水印与主题配置抽屉', () => {
  test('设置页开关控制 Shell 水印，刷新后保留，且不挡住多标签与锁屏', async ({
    page,
  }) => {
    await login(page);

    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expect(page.getByTestId('shell-watermark')).toHaveCount(0);

    await page.goto('/#/settings');
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByTestId('setting-theme-watermark')).toBeVisible();
    await expect(page.getByText('theme.watermark', { exact: true })).toBeVisible();

    await page
      .getByTestId('setting-theme-watermark')
      .getByRole('switch')
      .click();

    const watermark = page.getByTestId('shell-watermark');
    await expect(watermark).toBeVisible();
    await expect(watermark.locator('[data-watermark="true"]')).toBeVisible();
    const overlayBox = await watermark.boundingBox();
    const contentBox = await page.locator('#main-content-scroll').boundingBox();
    expect(overlayBox).toBeTruthy();
    expect(contentBox).toBeTruthy();
    expect(overlayBox!.height).toBeGreaterThan(0);
    expect(overlayBox!.height).toBeGreaterThanOrEqual(contentBox!.height);
    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expect(page.getByTestId('shell-tag-settings')).toHaveAttribute(
      'data-active',
      'true',
    );

    await page.reload();
    await expect(page.getByTestId('shell-watermark')).toBeVisible();
    await expect(page.getByTestId('shell-tags-view')).toBeVisible();

    await page.locator('.p2-header-user-btn').click();
    await page.getByText('锁定屏幕', { exact: true }).click();
    const overlay = page.getByTestId('shell-lock-screen');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText('已锁定 · 输入 PIN 解锁')).toBeVisible();

    for (const digit of '123456'.split('')) {
      await page.locator(`[data-key="${digit}"]`).click();
    }
    await expect(overlay).toHaveCount(0);
    await expect(page.getByTestId('shell-watermark')).toBeVisible();
    await expect(page).toHaveURL(/#\/settings$/);
  });

  test('Header 调色板打开主题抽屉并可切换外观', async ({ page }) => {
    await login(page);

    await page.getByTestId('shell-theme-config-trigger').click();
    const drawer = page.getByTestId('shell-theme-config-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('外观')).toBeVisible();
    await expect(drawer.getByText('主色')).toBeVisible();
    await expect(drawer.getByText('紧凑密度')).toBeVisible();

    await drawer.getByText('深色', { exact: true }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.locator('.p2-header-user-btn').click();
    await expect(page.getByText('主题模式：深色')).toBeVisible();
  });
});
