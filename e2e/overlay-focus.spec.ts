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

async function expectCreateDrawerEscRestoresFocus(
  page: import('@playwright/test').Page,
  testInfo: import('@playwright/test').TestInfo,
  path: string,
  triggerName: string,
  fieldPlaceholder: string,
) {
  await page.goto(appPath(testInfo, path));
  const trigger = page.getByRole('button', { name: triggerName });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const field = page.getByPlaceholder(fieldPlaceholder);
  await expect(field).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(field).toBeHidden();
  await expectFocused(trigger);
}

test.describe('页面 Drawer 焦点恢复', () => {
  test('工单 / 日历 / 任务新建 Drawer Esc 后焦点回到触发器', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page, testInfo);
    await expectCreateDrawerEscRestoresFocus(
      page,
      testInfo,
      '/tickets',
      '新建工单',
      '简要描述问题或需求',
    );
    await expectCreateDrawerEscRestoresFocus(
      page,
      testInfo,
      '/calendar',
      '新建事件',
      '例如：迭代评审会',
    );
    await expectCreateDrawerEscRestoresFocus(
      page,
      testInfo,
      '/jobs',
      '新建任务',
      '例如：每日对账批处理',
    );
  });

  test('帮助 FAQ Collapse 可键盘展开，报表 Segmented 可切换', async ({
    page,
  }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/help'));
    await expect(page.getByText('帮助中心').first()).toBeVisible();
    const permissionFaq = page.getByRole('button', {
      name: '为什么某些菜单看不到？',
    });
    await permissionFaq.scrollIntoViewIfNeeded();
    await permissionFaq.focus();
    await expectFocused(permissionFaq);
    await page.keyboard.press('Enter');
    await expect(
      page.getByText('左侧菜单会根据角色权限码过滤'),
    ).toBeVisible();

    await page.goto(appPath(testInfo, '/reports'));
    await expect(page.getByText('报表打印').first()).toBeVisible();
    await page.getByText('销售周报', { exact: true }).click();
    await expect(page.getByText('Tigercat 后台 · 销售周报').first()).toBeVisible();
  });

  test('大数据页「恢复顺序」按钮可键盘聚焦', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/performance'));
    await expect(page.getByText('大数据演示').first()).toBeVisible();
    await page.getByText('自由拖拽', { exact: true }).click();
    const restore = page.getByRole('button', { name: '恢复顺序' });
    await expect(restore).toBeVisible();
    await restore.focus();
    await expectFocused(restore);
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
