import { expect, test } from '@playwright/test';
import {
  appPath,
  expectAppNotEmptyShell,
  expectFocused,
  loginAsAdmin,
  logoutFromHeader,
} from './fixtures/a11y';

async function inputPin(page: import('@playwright/test').Page, code: string) {
  const root = page.getByTestId('shell-lock-pin-otp');
  await expect(root).toBeVisible();
  const slots = root.locator('input:not([type="hidden"])');
  for (let index = 0; index < code.length; index += 1) {
    await slots.nth(index).fill(code[index]);
  }
}

test.describe('弹层焦点恢复', () => {
  test('Spotlight Esc 关闭后焦点回到打开前的触发器', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    const trigger = page.getByTestId('shell-theme-config-trigger');
    await trigger.focus();
    await expectFocused(trigger);

    await page.keyboard.press('Control+k');
    const search = page.getByPlaceholder('搜索页面或操作，按回车执行');
    await expect(search).toBeVisible();
    await expectFocused(search);

    await page.keyboard.press('Escape');
    await expect(search).toBeHidden();
    await expectFocused(trigger);
  });

  test('通知 Popover Esc 关闭后焦点回到铃铛', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    const bell = page.locator('[data-tour="notification-bell"]');
    await bell.click();
    const viewAll = page.getByRole('button', { name: '查看全部通知' });
    await expect(viewAll).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(viewAll).toBeHidden();
    await expectFocused(bell);
  });

  test('主题 Drawer Esc 关闭后焦点回到调色板按钮', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    const trigger = page.getByTestId('shell-theme-config-trigger');
    await trigger.click();
    const drawer = page.getByTestId('shell-theme-config-drawer');
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expectFocused(trigger);
  });

  test('锁屏正确 PIN 解锁后焦点回到账户按钮', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    const accountTrigger = page.locator('.p2-header-user-btn');
    await accountTrigger.click();
    await page.getByText('锁定屏幕', { exact: true }).click();

    const overlay = page.getByTestId('shell-lock-screen');
    await expect(overlay).toBeVisible();
    await inputPin(page, '123456');
    await expect(overlay).toHaveCount(0);
    await expectFocused(accountTrigger);
  });
});

test.describe('Vue overlay 与异常页回归', () => {
  test('登录后 404 / 403 再回用户页再退出，应用根不是空 ConfigProvider', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page, testInfo);
    await expectAppNotEmptyShell(page);

    await page.goto(appPath(testInfo, '/users'));
    await expect(page.getByText('用户管理').first()).toBeVisible();
    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expectAppNotEmptyShell(page);

    await page.goto(appPath(testInfo, '/404'));
    await expect(page).toHaveURL(/\/404$/);
    await expect(page.getByRole('heading', { name: '页面不存在' })).toBeVisible();
    await expectAppNotEmptyShell(page);

    await page.goto(appPath(testInfo, '/403'));
    await expect(page).toHaveURL(/\/403$/);
    await expect(page.getByText('无权访问')).toBeVisible();
    await expectAppNotEmptyShell(page);

    await page.goto(appPath(testInfo, '/users'));
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByText('用户管理').first()).toBeVisible();
    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expectAppNotEmptyShell(page);

    await logoutFromHeader(page, testInfo);
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
    await expectAppNotEmptyShell(page);
  });
});
