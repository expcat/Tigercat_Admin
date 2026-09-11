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
    const usersCards = page.locator('[data-tiger-table-layout="card"]').first();
    await expect(usersCards).toBeVisible();
    // Header username is `hidden sm:inline`; assert the card row, not the chrome.
    await expect(usersCards.getByText('admin').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto(appPath(testInfo, '/roles'));
    await expect(page.getByText('角色管理').first()).toBeVisible();
    const rolesCards = page.locator('[data-tiger-table-layout="card"]').first();
    await expect(rolesCards).toBeVisible();
    await expect(rolesCards.getByText('Admin').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Tickets Splitter 窄屏为上下分栏且内容可见', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/tickets'));
    await expect(page.getByText('工单中心').first()).toBeVisible();
    await expect(page.locator('[data-direction="vertical"]').first()).toBeVisible();
    await expect(page.getByText('工单生命周期', { exact: true })).toBeVisible();
    await expect(page.getByText('工单信息', { exact: true })).toBeVisible();

    const actionBar = page.getByRole('toolbar', { name: '审批操作' });
    await actionBar.scrollIntoViewIfNeeded();
    await expect(actionBar).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();

    const chat = page.locator('#main-content-scroll [data-tiger-chat-window]').first();
    await chat.scrollIntoViewIfNeeded();
    await expect(chat).toBeVisible();
    // Narrow: skip Resizable so ChatWindow scroll does not fight a vertical splitter handle.
    await expect(page.locator('#main-content-scroll [data-resizable]')).toHaveCount(0);
    await expectNoPageHorizontalOverflow(page);
  });

  test('Approval detail 窄屏 ActionBar 与时间线可用且不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/approvals'));
    await expect(page.getByRole('button', { name: '发起审批' })).toBeVisible();
    await page.getByRole('button', { name: '查看' }).first().click();

    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: '审批进度' })).toBeVisible();
    const actionBar = page.getByRole('toolbar', { name: '审批操作' });
    await expect(actionBar).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
    await page.getByText('申请表单', { exact: true }).scrollIntoViewIfNeeded();
    await expect(actionBar).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('流程设计窄屏设计器与预览不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/workflow-designer'));
    const designer = page.getByRole('region', { name: '流程设计器' });
    await expect(designer).toBeVisible();
    await expect(designer.getByRole('group', { name: '主管会签' })).toBeVisible();
    await expect(designer.getByRole('button', { name: '在后方插入 (主管会签)' })).toBeVisible();
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

  test('Analytics / Profile 窄屏不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/analytics'));
    await expect(page.getByText('数据分析').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto(appPath(testInfo, '/profile'));
    await expect(page.getByText('个人中心').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Calendar 月视图窄屏不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/calendar'));
    await expect(page.getByText('团队日历').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '新建事件' })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Content / Gallery 窄屏不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/content'));
    await expect(page.getByText('内容编辑').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto(appPath(testInfo, '/gallery'));
    await expect(page.getByText('媒体图库').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Jobs / Import 窄屏不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/jobs'));
    await expect(page.getByText('任务列表').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '新建任务' })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto(appPath(testInfo, '/import'));
    await expect(page.getByText('数据导入').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Help / Reports 窄屏不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);

    await page.goto(appPath(testInfo, '/help'));
    await expect(page.getByText('帮助中心').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto(appPath(testInfo, '/reports'));
    await expect(page.getByText('报表打印').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Performance 窄屏不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/performance'));
    await expect(page.getByText('大数据演示').first()).toBeVisible();
    await expect(page.getByTestId('performance-virtual-list')).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('多标签与锁屏窄屏不溢出', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/settings'));
    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expect(page.getByTestId('shell-tag-settings')).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.locator('.p2-header-user-btn').click();
    await page.getByText('锁定屏幕', { exact: true }).click();
    const overlay = page.getByTestId('shell-lock-screen');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText('已锁定 · 输入 PIN 解锁')).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
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

    await expect(page.getByTestId('shell-tags-view')).toBeVisible();
    await expect(page.getByTestId('shell-tag-home')).toBeVisible();

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
    const ticketBar = page.getByRole('toolbar', { name: '审批操作' });
    await ticketBar.scrollIntoViewIfNeeded();
    await expect(ticketBar).toBeVisible();
    const chat = page.locator('#main-content-scroll [data-tiger-chat-window]').first();
    await chat.scrollIntoViewIfNeeded();
    await expect(chat).toBeVisible();

    await page.goto(appPath(testInfo, '/approvals'));
    await page.getByRole('button', { name: '查看' }).first().click();
    const approvalBar = page.getByRole('toolbar', { name: '审批操作' });
    await approvalBar.scrollIntoViewIfNeeded();
    await expect(approvalBar).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Analytics / Profile / Calendar / Content 在暗色下可见', async ({
    page,
  }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await expectDarkSchemeApplied(page);

    await page.goto(appPath(testInfo, '/analytics'));
    await expect(page.getByText('数据分析').first()).toBeVisible();

    await page.goto(appPath(testInfo, '/profile'));
    await expect(page.getByText('个人中心').first()).toBeVisible();

    await page.goto(appPath(testInfo, '/calendar'));
    await expect(page.getByText('团队日历').first()).toBeVisible();

    await page.goto(appPath(testInfo, '/content'));
    await expect(page.getByText('内容编辑').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Gallery / Jobs / Import / Help / Reports / Performance 在暗色下可见', async ({
    page,
  }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await expectDarkSchemeApplied(page);

    for (const [path, title] of [
      ['/gallery', '媒体图库'],
      ['/jobs', '任务列表'],
      ['/import', '数据导入'],
      ['/help', '帮助中心'],
      ['/reports', '报表打印'],
      ['/performance', '大数据演示'],
    ] as const) {
      await page.goto(appPath(testInfo, path));
      await expect(page.getByText(title).first()).toBeVisible();
    }

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
