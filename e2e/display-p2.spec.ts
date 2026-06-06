import { expect, SESSION_KEY, test, uniqueSuffix } from './fixtures/auth';
import type { Locator, Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

const protectedPages = [
  { path: '/dashboard', text: '欢迎回来' },
  { path: '/users', text: '用户管理' },
  { path: '/roles', text: '角色管理' },
  { path: '/files', text: '文件管理' },
  { path: '/tasks', text: '任务面板' },
  { path: '/notifications', text: '通知中心' },
  { path: '/audit-logs', text: '审计日志' },
  { path: '/settings', text: '系统设置' },
] as const;

type UploadedMedia = {
  id: number;
  fileName: string;
};

async function expectNoPageHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
        return scrollWidth - window.innerWidth;
      }),
    )
    .toBeLessThanOrEqual(1);
}

async function expectInViewport(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const isInViewport = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight
    );
  });
  expect(isInViewport).toBe(true);
}

async function expectFullyInViewport(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const isFullyInViewport = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.left >= -1 &&
      rect.top >= -1 &&
      rect.right <= window.innerWidth + 1 &&
      rect.bottom <= window.innerHeight + 1
    );
  });
  expect(isFullyInViewport).toBe(true);
}

async function expectFocused(locator: Locator) {
  await expect
    .poll(async () =>
      locator.evaluate((element) => {
        const active = document.activeElement;
        return active === element || element.contains(active);
      }),
    )
    .toBe(true);
}

async function expectDialogFooterReachable(dialog: Locator, buttonName: string) {
  const action = dialog.getByRole('button', { name: buttonName });
  await expectInViewport(action);
}

async function expectEscClosesAndFocusReturns(
  page: Page,
  trigger: Locator,
  openTarget: Locator,
) {
  await trigger.focus();
  await trigger.click();
  await expect(openTarget).toBeVisible();
  await expectFullyInViewport(openTarget);
  await page.keyboard.press('Escape');
  await expect(openTarget).toBeHidden();
  await expectFocused(trigger);
}

async function uploadTestMedia(page: Page): Promise<UploadedMedia> {
  const fileName = `p4-media-${uniqueSuffix()}.txt`;
  const media = await page.evaluate(
    async ({ key, fileName }) => {
      const session = JSON.parse(window.localStorage.getItem(key) || 'null') as
        | { token?: string }
        | null;
      if (!session?.token) {
        throw new Error('Missing admin session');
      }

      const form = new FormData();
      form.append('file', new Blob([`P4 display gate ${fileName} ${Date.now()}`], { type: 'text/plain' }), fileName);
      form.append('usage', 'file');

      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: form,
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `Upload failed: ${response.status}`);
      }

      return payload.data as { id: number };
    },
    { key: SESSION_KEY, fileName },
  );

  return { id: media.id, fileName };
}

async function deleteTestMedia(page: Page, id: number) {
  await page.evaluate(
    async ({ key, id }) => {
      const session = JSON.parse(window.localStorage.getItem(key) || 'null') as
        | { token?: string }
        | null;
      if (!session?.token) return;

      await fetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => undefined);
    },
    { key: SESSION_KEY, id },
  );
}

async function openFirstRowMenu(page: Page, itemName: string) {
  const trigger = page.getByRole('button', { name: '操作' }).last();

  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  await expectInViewport(trigger);
  await trigger.click();
  const item = page.getByRole('menuitem', { name: itemName });
  await expect(item).toBeVisible();
  await expectFullyInViewport(item);
  return { trigger, item };
}

async function expectColumnToggleReachable(page: Page, checkboxName: string) {
  const columnsTrigger = page.getByRole('button', { name: '列显隐' });
  const checkbox = page.getByRole('checkbox', { name: checkboxName }).first();

  await expect
    .poll(async () => {
      const triggerCount = await columnsTrigger.count();
      const checkboxCount = await checkbox.count();
      return triggerCount + checkboxCount;
    })
    .toBeGreaterThan(0);

  if ((await columnsTrigger.count()) > 0) {
    await expect(columnsTrigger).toBeVisible();
    await expect(columnsTrigger).toBeEnabled();
    await columnsTrigger.scrollIntoViewIfNeeded();
    await columnsTrigger.click();

    const expanded = await columnsTrigger.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await columnsTrigger.click();
    }
  }

  await expect(checkbox).toBeVisible();
  await expectFullyInViewport(checkbox);
  await page.keyboard.press('Escape');
}

async function expectSidebarWidth(page: Page, width: number) {
  const sidebar = page.locator('#main-sidebar .tiger-sidebar').first();
  await expect(sidebar).toBeVisible();
  await expect
    .poll(async () =>
      sidebar.evaluate((element) => Math.round(element.getBoundingClientRect().width)),
    )
    .toBe(width);
}

async function expectSidebarHasTransition(page: Page) {
  const sidebar = page.locator('#main-sidebar .tiger-sidebar').first();
  const transition = await sidebar.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      property: style.transitionProperty,
      duration: style.transitionDuration,
    };
  });

  expect(transition.property).not.toBe('none');
  expect(transition.duration).not.toBe('0s');
}

async function expectMobileDrawerHasTransition(drawerPanel: Locator) {
  const transition = await drawerPanel.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      property: style.transitionProperty,
      duration: style.transitionDuration,
    };
  });

  expect(transition.property).toContain('transform');
  expect(transition.duration).not.toBe('0s');
}

async function expectMobileDrawerClosed(page: Page) {
  await expect(page.locator('[data-tiger-drawer]').first()).toBeHidden();
  await expect(page.locator('#main-sidebar')).toHaveCount(0);
}

function getCollapsedSystemMenuTrigger(page: Page): Locator {
  return page.locator('#main-sidebar').getByRole('menuitem').nth(1);
}

test.describe('P4 可访问性与响应式门禁', () => {
  test('认证页在移动端和暗色模式下不溢出', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/login');
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto('/register');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.getByRole('heading', { name: '创建账号' })).toBeVisible();
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('核心页面桌面和暗色模式无页面级横向溢出', async ({
    page,
    loginAsAdmin,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginAsAdmin();
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    await expectSidebarWidth(page, 240);
    await expectSidebarHasTransition(page);
    await page.getByRole('button', { name: '关闭导航菜单' }).click();
    await expectSidebarWidth(page, 64);
    await getCollapsedSystemMenuTrigger(page).click();
    await expectSidebarWidth(page, 64);
    await expectNoPageHorizontalOverflow(page);
    await page.getByRole('button', { name: '打开导航菜单' }).click();
    await expectSidebarWidth(page, 240);

    for (const item of protectedPages) {
      await page.goto(item.path);
      await expect(page.getByText(item.text).first()).toBeVisible();
      await expectNoPageHorizontalOverflow(page);
    }
  });

  test('移动端 shell 菜单、面包屑和账户菜单可达', async ({
    page,
    loginAsAdmin,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsAdmin();

    const toggle = page.getByRole('button', { name: '打开导航菜单' });
    await expect(toggle).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await toggle.click();
    const drawerMask = page.locator('[data-tiger-drawer-mask]').first();
    const drawerPanel = page.locator('[data-tiger-drawer]').first();
    await expect(drawerMask).toBeVisible();
    await expect(drawerPanel).toBeVisible();
    await expectMobileDrawerHasTransition(drawerPanel);
    await expect
      .poll(async () =>
        drawerPanel.evaluate((element) => Math.round(element.getBoundingClientRect().width)),
      )
      .toBe(240);
    await drawerMask.click({ position: { x: 320, y: 120 } });
    await expectMobileDrawerClosed(page);
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible();
    await expectFocused(toggle);

    await toggle.click();
    await expect(drawerMask).toBeVisible();
    await page.keyboard.press('Escape');
    await expectMobileDrawerClosed(page);
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible();
    await expectFocused(toggle);

    await toggle.click();
    await page
      .locator('#main-sidebar')
      .getByRole('menuitem', { name: '系统管理' })
      .click();
    await page
      .locator('#main-sidebar')
      .getByRole('menuitem', { name: '用户管理' })
      .click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible();
    await expect(page.getByText('用户管理').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    const accountTrigger = page.getByRole('button', { name: 'admin' });
    await accountTrigger.click();
    const themeMenuItem = page.getByRole('menuitem', { name: /主题模式/ });
    await expect(themeMenuItem).toBeVisible();
    await expectFullyInViewport(themeMenuItem);
    await page.keyboard.press('Escape');
    await expect(themeMenuItem).toBeHidden();

    for (const item of protectedPages) {
      await page.goto(item.path);
      await expect(page.getByText(item.text).first()).toBeVisible();
      await expectNoPageHorizontalOverflow(page);
    }
  });

  test('Users 表格工具、行菜单、角色下拉和弹层键盘路径稳定', async ({
    page,
    loginAsAdmin,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsAdmin();
    await page.goto('/users');
    await expect(page.getByText('用户管理').first()).toBeVisible();

    await expectColumnToggleReachable(page, '用户名');

    const exportTrigger = page.getByRole('button', { name: '导出' });
    await expectEscClosesAndFocusReturns(
      page,
      exportTrigger,
      page.getByRole('dialog', { name: '导出用户数据' }),
    );

    await openFirstRowMenu(page, '编辑用户');
    await page.keyboard.press('Escape');

    const createTrigger = page.getByRole('button', { name: '新增用户' });
    await createTrigger.click();
    const userDialog = page.getByRole('dialog', { name: '新增用户' });
    await expect(userDialog).toBeVisible();
    await expectDialogFooterReachable(userDialog, '确定');

    const roleSelect = userDialog.getByRole('button', { name: '请选择角色（可多选）' });
    await roleSelect.click();
    const roleListbox = page.getByRole('listbox').last();
    await expect(roleListbox.getByRole('option').first()).toBeVisible();
    await expectFullyInViewport(roleListbox);
    await page.keyboard.press('Escape');
    await expectDialogFooterReachable(userDialog, '确定');
    await userDialog.getByRole('button', { name: '取消' }).click();
    await expect(userDialog).toBeHidden();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Roles 列工具、权限树、行菜单和弹层键盘路径稳定', async ({
    page,
    loginAsAdmin,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsAdmin();
    await page.goto('/roles');
    await expect(page.getByText('角色管理').first()).toBeVisible();

    await expectColumnToggleReachable(page, '角色名称');

    const exportTrigger = page.getByRole('button', { name: '导出' });
    await expectEscClosesAndFocusReturns(
      page,
      exportTrigger,
      page.getByRole('dialog', { name: '导出角色数据' }),
    );

    const { item: permissionItem } = await openFirstRowMenu(page, '权限配置');
    await permissionItem.click();

    const permissionDialog = page.getByRole('dialog', { name: /权限配置/ });
    await expect(permissionDialog).toBeVisible();
    await expect(permissionDialog.getByRole('tree', { name: '角色权限树' })).toBeVisible();
    await expectDialogFooterReachable(permissionDialog, '保存');
    await page.keyboard.press('Escape');
    await expect(permissionDialog).toBeHidden();
    await expectNoPageHorizontalOverflow(page);
  });

  test('Files 和 Settings 移动端确认路径、筛选和按钮换行可达', async ({
    page,
    loginAsAdmin,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsAdmin();

    const media = await uploadTestMedia(page);
    try {
      await page.goto('/files');
      await expect(page.getByText('文件管理').first()).toBeVisible();

      const typeFilter = page.getByRole('button', { name: '筛选类型' });
      await typeFilter.click();
      const listbox = page
        .getByRole('listbox')
        .filter({ has: page.getByRole('option', { name: '文本' }) })
        .first();
      await expect(listbox.getByRole('option', { name: '文本' })).toBeVisible();
      await expectFullyInViewport(listbox);
      await page.keyboard.press('Escape');

      const uploadedOption = page.getByRole('option', { name: new RegExp(media.fileName) });
      await expect(uploadedOption).toBeVisible();
      await uploadedOption.click();

      const deleteTrigger = page.getByRole('button', { name: '删除选中' });
      await expect(deleteTrigger).toBeEnabled();
      await deleteTrigger.click();
      const deleteDialog = page.getByRole('dialog', { name: '确认删除文件' });
      await expect(deleteDialog).toBeVisible();
      await expectDialogFooterReachable(deleteDialog, '确认删除');
      await deleteDialog.getByRole('button', { name: '取消' }).click();
      await expect(deleteDialog).toBeHidden();
      await expectNoPageHorizontalOverflow(page);

      await page.goto('/settings');
      await expect(page.getByText('系统设置').first()).toBeVisible();
      await expect(page.getByText(/暂无 Logo|当前持久化值/).first()).toBeVisible();
      await expectNoPageHorizontalOverflow(page);

      const siteName = page.getByRole('textbox', { name: '输入 site.name 的值' });
      await expect(siteName).not.toHaveValue('');
      await siteName.fill(`P4 临时站点 ${uniqueSuffix()}`);

      const saveTrigger = page.getByRole('button', { name: '保存修改' });
      await expect(saveTrigger).toBeEnabled();
      await saveTrigger.click();
      const saveDialog = page.getByRole('dialog', { name: '确认保存设置' });
      await expect(saveDialog).toBeVisible();
      await expectDialogFooterReachable(saveDialog, '确认保存');
      await saveDialog.getByRole('button', { name: '取消' }).click();
      await expect(saveDialog).toBeHidden();

      const restoreTrigger = page.getByRole('button', { name: '恢复默认值' });
      await expect(restoreTrigger).toBeEnabled();
      await restoreTrigger.click();
      const restoreDialog = page.getByRole('dialog', { name: '恢复默认值' });
      await expect(restoreDialog).toBeVisible();
      await expectFullyInViewport(restoreDialog);
      await page.keyboard.press('Escape');
      await expect(restoreDialog).toBeHidden();
      await expectNoPageHorizontalOverflow(page);
    } finally {
      await deleteTestMedia(page, media.id);
    }
  });
});
