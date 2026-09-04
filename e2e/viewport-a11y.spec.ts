import { expect, test } from '@playwright/test';
import {
  appPath,
  expectAppNotEmptyShell,
  expectDarkSchemeApplied,
  expectInViewport,
  expectNoPageHorizontalOverflow,
  isDemoProject,
  loginAsAdmin,
  loginAsDemo,
} from './fixtures/a11y';

test.describe('375 viewport coverage', { tag: '@mobile' }, () => {
  test('Shell 挂件在窄屏不溢出视口', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    const bell = page.locator('[data-tour="notification-bell"]');
    const themeTrigger = page.getByTestId('shell-theme-config-trigger');
    const chatDock = page.locator('[data-tour="chat-dock"]');
    await expectInViewport(bell);
    await expectInViewport(themeTrigger);
    await expectInViewport(chatDock);
    await expectNoPageHorizontalOverflow(page);

    await page.keyboard.press('Control+k');
    const search = page.getByPlaceholder('搜索页面或操作，按回车执行');
    await expect(search).toBeVisible();
    await expectInViewport(search);
    await page.keyboard.press('Escape');
    await expect(search).toBeHidden();

    await bell.click();
    const viewAll = page.getByRole('button', { name: '查看全部通知' });
    await expect(viewAll).toBeVisible();
    await expectInViewport(viewAll);
    await page.keyboard.press('Escape');
    await expect(viewAll).toBeHidden();

    await chatDock.click();
    await expect(page.getByText('在线客服').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
    await page.keyboard.press('Escape');
  });

  test('Users / Roles 窄屏切换为卡片且不撑破视口', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/users'));
    await expect(page.getByText('用户管理').first()).toBeVisible();
    await expect(page.locator('[data-tiger-table-layout="card"]').first()).toBeVisible();
    await expect(page.getByText('admin').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto(appPath(testInfo, '/roles'));
    await expect(page.getByText('角色管理').first()).toBeVisible();
    await expect(page.locator('[data-tiger-table-layout="card"]').first()).toBeVisible();
    await expect(page.getByText('Admin').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Tickets Splitter 窄屏为上下分栏且内容可见', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/tickets'));
    await expect(page.getByText('工单中心').first()).toBeVisible();
    await expect(page.locator('[data-direction="vertical"]').first()).toBeVisible();
    await expect(page.getByText('工单生命周期', { exact: true })).toBeVisible();
    await expect(page.getByText('工单信息', { exact: true })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('异常页 403 / 404 / 500 窄屏居中不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    for (const [path, heading] of [
      ['/403', '无权访问'],
      ['/404', '页面不存在'],
      ['/500', '服务异常'],
    ] as const) {
      await page.goto(appPath(testInfo, path));
      await expect(page.getByText(heading).first()).toBeVisible();
      await expect(page.getByRole('button', { name: '返回首页' })).toBeVisible();
      await expectAppNotEmptyShell(page);
      await expectNoPageHorizontalOverflow(page);
    }
  });

  test('Auth OTP 窄屏数字格不溢出', async ({ page }, testInfo) => {
    test.skip(!isDemoProject(testInfo), '两步验证 OTP 仅 MockApi 演示账号');

    await loginAsDemo(page, testInfo);
    await expect(page.getByTestId('auth-otp-input')).toBeVisible();
    await expect(page.getByText('演示验证码：123456')).toBeVisible();
    await expect(page.getByRole('button', { name: '验证', exact: true })).toBeDisabled();
    await expectNoPageHorizontalOverflow(page);
    await expectAppNotEmptyShell(page);
  });
});

test.describe('dark colorScheme coverage', { tag: '@dark' }, () => {
  test('Shell 挂件在暗色下可读且浮层可打开', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await expectDarkSchemeApplied(page);
    await expectAppNotEmptyShell(page);

    await page.locator('[data-tour="notification-bell"]').click();
    await expect(page.getByRole('button', { name: '查看全部通知' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('shell-theme-config-trigger').click();
    const drawer = page.getByTestId('shell-theme-config-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('外观')).toBeVisible();
    await page.keyboard.press('Escape');
    await expectNoPageHorizontalOverflow(page);
  });

  test('Users / Roles 与 Tickets 在暗色下可见', async ({
    page,
  }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await expectDarkSchemeApplied(page);

    await page.goto(appPath(testInfo, '/users'));
    await expect(page.getByText('用户管理').first()).toBeVisible();
    await expect(page.getByText('admin').first()).toBeVisible();

    await page.goto(appPath(testInfo, '/roles'));
    await expect(page.getByText('角色管理').first()).toBeVisible();
    await expect(page.getByText('Admin').first()).toBeVisible();

    await page.goto(appPath(testInfo, '/tickets'));
    await expect(page.getByText('工单中心').first()).toBeVisible();
    await expect(page.getByText('工单生命周期', { exact: true })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('异常页与 Auth OTP 在暗色下可读', async ({ page }, testInfo) => {
    await page.goto(appPath(testInfo, '/403'));
    await expect(page.getByText('无权访问')).toBeVisible();
    await expectDarkSchemeApplied(page);

    await page.goto(appPath(testInfo, '/404'));
    await expect(page.getByText('页面不存在')).toBeVisible();

    await page.goto(appPath(testInfo, '/500'));
    await expect(page.getByText('服务异常')).toBeVisible();

    if (isDemoProject(testInfo)) {
      await loginAsDemo(page, testInfo);
      await expect(page.getByRole('heading', { name: '两步验证' })).toBeVisible();
      await expect(page.getByTestId('auth-otp-input')).toBeVisible();
      await expectDarkSchemeApplied(page);
    }
  });
});
