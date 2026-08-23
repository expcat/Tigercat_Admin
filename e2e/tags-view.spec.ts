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

test.describe('多标签页导航（tags-view）', () => {
  test('打开受保护路由生成标签，点击切换，关闭当前回到相邻页', async ({ page }) => {
    await login(page);

    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expect(page.getByTestId('shell-tag-home')).toHaveAttribute('data-active', 'true');

    await page.goto('/#/settings');
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByTestId('shell-tag-settings')).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('shell-tag-home')).toBeVisible();

    await page.getByTestId('shell-tag-home').click();
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.getByTestId('shell-tag-home')).toHaveAttribute('data-active', 'true');

    await page.getByTestId('shell-tag-settings').click();
    await expect(page).toHaveURL(/#\/settings$/);
    await page.getByRole('button', { name: '关闭系统设置' }).click();
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.getByTestId('shell-tag-settings')).toHaveCount(0);
    await expect(page.getByTestId('shell-tag-home')).toHaveAttribute('data-active', 'true');
  });

  test('关闭其他 / 关闭全部保留固定仪表盘，刷新后恢复标签', async ({ page }) => {
    await login(page);

    await page.goto('/#/about');
    await expect(page.getByTestId('shell-tag-about')).toHaveAttribute('data-active', 'true');
    await page.goto('/#/settings');
    await expect(page.getByTestId('shell-tag-about')).toBeVisible();
    await expect(page.getByTestId('shell-tag-settings')).toHaveAttribute('data-active', 'true');

    await page.getByTestId('shell-tags-view-actions').click();
    await page.getByText('关闭其他', { exact: true }).click();
    await expect(page.getByTestId('shell-tag-about')).toHaveCount(0);
    await expect(page.getByTestId('shell-tag-home')).toBeVisible();
    await expect(page.getByTestId('shell-tag-settings')).toHaveAttribute('data-active', 'true');

    await page.getByTestId('shell-tags-view-actions').click();
    await page.getByText('关闭全部', { exact: true }).click();
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.getByTestId('shell-tag-settings')).toHaveCount(0);
    await expect(page.getByTestId('shell-tag-home')).toHaveAttribute('data-active', 'true');

    await page.goto('/#/profile');
    await expect(page.getByTestId('shell-tag-profile')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/#\/profile$/);
    await expect(page.getByTestId('shell-tag-home')).toBeVisible();
    await expect(page.getByTestId('shell-tag-profile')).toHaveAttribute('data-active', 'true');
  });

  test('游客页与异常页不显示标签条', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.getByTestId('shell-tags-view')).toHaveCount(0);

    await page.goto('/#/403');
    await expect(page.getByTestId('shell-tags-view')).toHaveCount(0);

    await page.goto('/#/404');
    await expect(page.getByTestId('shell-tags-view')).toHaveCount(0);
  });
});
