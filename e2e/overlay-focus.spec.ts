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

/** Trigger, its chrome root, or the page — not a leftover overlay. */
async function expectFocusReturnedToPage(
  trigger: import('@playwright/test').Locator,
): Promise<void> {
  await expect
    .poll(async () =>
      trigger.evaluate((element) => {
        const active = document.activeElement;
        if (!active) return false;
        if (active === element || element.contains(active) || active.contains(element)) {
          return true;
        }
        const chrome = element.closest('[data-tiger-chrome]');
        if (chrome && chrome.contains(active)) return true;
        const trapped = active.closest(
          [
            '[data-tiger-overlay-layer]',
            '[data-tiger="datepicker-panel"]',
            '[data-tiger="timepicker-panel"]',
            '[data-tiger-autocomplete-dropdown]',
            '[data-tiger-treeselect-dropdown]',
            '[data-tiger-cascader-dropdown]',
            '[data-tiger-image-preview]',
            '[data-tiger-drawer]',
          ].join(', '),
        );
        return !trapped;
      }),
    )
    .toBe(true);
}

async function expectEscClosesOverlay(
  page: import('@playwright/test').Page,
  trigger: import('@playwright/test').Locator,
  overlay: import('@playwright/test').Locator,
  options: { restoreTrigger?: boolean; extraEscapes?: number } = {},
) {
  await trigger.scrollIntoViewIfNeeded();
  await trigger.evaluate((element) => {
    if (element instanceof HTMLElement) element.blur();
  });
  await trigger.click();
  await expect(overlay).toBeVisible();
  await page.keyboard.press('Escape');
  for (let extra = 0; extra < (options.extraEscapes ?? 0); extra += 1) {
    if (await overlay.isHidden()) break;
    await page.keyboard.press('Escape');
  }
  await expect(overlay).toBeHidden();
  if (options.restoreTrigger) {
    await expectFocused(trigger);
  } else {
    await expectFocusReturnedToPage(trigger);
  }
}

async function expectOutsideClickClosesOverlay(
  page: import('@playwright/test').Page,
  trigger: import('@playwright/test').Locator,
  overlay: import('@playwright/test').Locator,
  outside: import('@playwright/test').Locator,
) {
  await trigger.scrollIntoViewIfNeeded();
  await trigger.evaluate((element) => {
    if (element instanceof HTMLElement) element.blur();
  });
  await trigger.click();
  await expect(overlay).toBeVisible();
  await outside.click({ force: true });
  await expect(overlay).toBeHidden();
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

test.describe('个人中心 / 数据分析浮层焦点', () => {
  test('/profile Tabs 方向键切换，DatePicker / TimePicker Esc 与外部点击关闭', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/profile'));
    await expect(page.getByText('个人中心').first()).toBeVisible();

    const basicTab = page.getByRole('tab', { name: '基本资料' });
    await basicTab.focus();
    await expectFocused(basicTab);
    await page.keyboard.press('ArrowRight');
    const securityTab = page.getByRole('tab', { name: '安全设置' });
    await expect(securityTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('两步验证').first()).toBeVisible();

    await page.getByRole('tab', { name: '偏好' }).click();
    await expect(page.getByText('主题色').first()).toBeVisible();

    const dateTrigger = page.getByRole('button', { name: '打开日历' });
    const datePanel = page.locator('[data-tiger="datepicker-panel"]');
    await expectEscClosesOverlay(page, dateTrigger, datePanel);
    await expectOutsideClickClosesOverlay(
      page,
      dateTrigger,
      datePanel,
      page.getByText('界面密度', { exact: true }),
    );

    const timeTrigger = page.getByRole('button', { name: '打开时间选择器' });
    const timePanel = page.locator('[data-tiger="timepicker-panel"]');
    await expectEscClosesOverlay(page, timeTrigger, timePanel);
    await expectOutsideClickClosesOverlay(
      page,
      timeTrigger,
      timePanel,
      page.getByText('界面密度', { exact: true }),
    );
  });

  test('/analytics DatePicker 区间浮层 Esc 与外部点击关闭', async ({ page }, testInfo) => {
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/analytics'));
    await expect(page.getByText('数据分析').first()).toBeVisible();

    const dateTrigger = page.getByRole('button', { name: '打开日历' });
    const datePanel = page.locator('[data-tiger="datepicker-panel"]');
    await expectEscClosesOverlay(page, dateTrigger, datePanel);
    await expectOutsideClickClosesOverlay(
      page,
      dateTrigger,
      datePanel,
      page.getByText('数据分析').first(),
    );
  });
});

test.describe('内容编辑 / 媒体图库浮层焦点', () => {
  test('/content AutoComplete / TreeSelect / Cascader Esc 与外部点击关闭', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/content'));
    await expect(page.getByText('内容编辑').first()).toBeVisible();

    const pageTitle = page.getByText('内容编辑').first();
    const titleInput = page.getByPlaceholder('请输入内容标题');
    const autoCompleteDropdown = page.locator('[data-tiger-autocomplete-dropdown]');
    await expectEscClosesOverlay(page, titleInput, autoCompleteDropdown);
    await expectOutsideClickClosesOverlay(page, titleInput, autoCompleteDropdown, pageTitle);

    const treeTrigger = page.getByRole('combobox').filter({ hasText: /^前端$/ });
    const treeDropdown = page.locator('[data-tiger-treeselect-dropdown]');
    await expectEscClosesOverlay(page, treeTrigger, treeDropdown, { extraEscapes: 2 });
    await expectOutsideClickClosesOverlay(page, treeTrigger, treeDropdown, pageTitle);

    const cascaderTrigger = page.getByRole('combobox').filter({ hasText: '文档 / 指南' });
    const cascaderDropdown = page.locator('[data-tiger-cascader-dropdown]');
    await expectEscClosesOverlay(page, cascaderTrigger, cascaderDropdown);
    await expectOutsideClickClosesOverlay(page, cascaderTrigger, cascaderDropdown, pageTitle);
  });

  test('/gallery ImageViewer / ImagePreview 与标注裁剪 Drawer Esc 后焦点回到触发器', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page, testInfo);
    await page.goto(appPath(testInfo, '/gallery'));
    await expect(page.getByText('媒体图库').first()).toBeVisible();
    await expect(page.getByText('产品概览').first()).toBeVisible();

    const preview = page.locator('[data-tiger-image-preview]');
    const viewButton = page.getByRole('button', { name: '查看' }).first();
    await expectEscClosesOverlay(page, viewButton, preview, { restoreTrigger: true });

    const slideshow = page.getByRole('button', { name: '幻灯片预览' });
    await expectEscClosesOverlay(page, slideshow, preview, { restoreTrigger: true });

    const annotate = page.getByRole('button', { name: '标注' }).first();
    const annotateDrawer = page.getByRole('dialog', { name: '图片标注' });
    await expectEscClosesOverlay(page, annotate, annotateDrawer, { restoreTrigger: true });

    const crop = page.getByRole('button', { name: '裁剪' }).first();
    const cropDrawer = page.getByRole('dialog', { name: '图片裁剪' });
    await expectEscClosesOverlay(page, crop, cropDrawer, { restoreTrigger: true });
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
