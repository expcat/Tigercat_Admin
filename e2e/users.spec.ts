import { escapeRegExp, expect, SESSION_KEY, test, uniqueSuffix } from './fixtures/auth';
import type { Page } from '@playwright/test';

const SEARCH_PLACEHOLDER = '搜索用户名或显示名...';

async function gotoUsers(page: Page) {
  await page.goto('/users');
  await expect(page.getByRole('button', { name: '新增用户' })).toBeVisible();
}

async function searchUser(page: Page, keyword: string) {
  const box = page.getByPlaceholder(SEARCH_PLACEHOLDER);
  await box.fill(keyword);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  // 等待服务端分页刷新完成，避免表格重渲染时下拉菜单项被 detach。
  await page.waitForLoadState('networkidle');
}

async function createUser(
  page: Page,
  options: {
    username: string;
    password: string;
    displayName?: string;
    role?: string;
  },
) {
  await page.getByRole('button', { name: '新增用户' }).click();
  const dialog = page.getByRole('dialog', { name: '新增用户' });
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder('请输入用户名').fill(options.username);
  await dialog.getByPlaceholder('请输入密码').fill(options.password);
  if (options.displayName) {
    await dialog
      .getByPlaceholder('请输入显示名称（选填）')
      .fill(options.displayName);
  }
  if (options.role) {
    await dialog.getByRole('combobox', { name: /角色|请选择角色/ }).click();
    await page.getByRole('option', { name: options.role, exact: true }).click();
    // 多选下拉选中后保持展开，会遮挡“确定”按钮，需先关闭。
    await page.keyboard.press('Escape');
  }

  await dialog.getByRole('button', { name: '确定' }).click();
  await expect(dialog).toBeHidden();
}

function userRow(page: Page, username: string) {
  return page.getByRole('row', { name: new RegExp(escapeRegExp(username)) });
}

async function checkUserRow(page: Page, username: string) {
  await userRow(page, username).getByRole('checkbox').check({ force: true });
}

async function clickRowMenuItem(
  page: Page,
  row: ReturnType<typeof userRow>,
  name: string,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const trigger = row.getByRole('button', { name: '操作' });
    await expect(trigger).toBeVisible({ timeout: 2000 });
    try {
      await trigger.click({ timeout: 2000 });
    } catch {
      await trigger.evaluate((element) => (element as HTMLElement).click());
    }

    const item = page.getByRole('menuitem', { name });

    try {
      await expect(item).toBeVisible({ timeout: 2000 });
      try {
        await item.click({ timeout: 2000 });
      } catch {
        const clicked = await page.evaluate((menuName) => {
          const menuItems = Array.from(
            document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
          );
          const current = menuItems.find((element) =>
            element.textContent?.trim().includes(menuName),
          );
          current?.click();
          return Boolean(current);
        }, name);
        if (!clicked) {
          throw new Error(`未找到菜单项：${name}`);
        }
      }
      return;
    } catch (error) {
      lastError = error;
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  throw lastError;
}

async function deleteUser(page: Page, username: string) {
  await searchUser(page, username);
  const row = userRow(page, username);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '删除', exact: true }).evaluate((element) =>
    (element as HTMLElement).click(),
  );
  await page
    .getByRole('dialog', { name: /确认删除用户/ })
    .getByRole('button', { name: '删除' })
    .evaluate((element) => (element as HTMLElement).click());
  await expect(row).toBeHidden();
}

test.describe('用户管理主流程', () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin();
  });

  test('创建用户后可检索并删除', async ({ page }) => {
    const username = `e2e_user_${uniqueSuffix()}`;
    await gotoUsers(page);

    await createUser(page, {
      username,
      password: 'e2e_pass123',
      displayName: 'E2E 用户',
      role: 'Viewer',
    });

    await searchUser(page, username);
    const row = userRow(page, username);
    await expect(row).toBeVisible();
    await expect(row.getByText('E2E 用户')).toBeVisible();
    await expect(row.getByText('Viewer')).toBeVisible();

    await deleteUser(page, username);
  });

  test('编辑用户可修改显示名并禁用状态', async ({ page }) => {
    const username = `e2e_edit_${uniqueSuffix()}`;
    await gotoUsers(page);
    await createUser(page, {
      username,
      password: 'e2e_pass123',
      displayName: '编辑前',
      role: 'Viewer',
    });

    await searchUser(page, username);
    const row = userRow(page, username);
    await expect(row).toBeVisible();

    await clickRowMenuItem(page, row, '编辑用户');

    const dialog = page.getByRole('dialog', { name: '编辑用户' });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('请输入显示名称（选填）').fill('编辑后');
    // 状态选择：当前“正常”，切换为“禁用”。
    await dialog.getByRole('combobox', { name: '状态' }).click();
    await page.getByRole('option', { name: '禁用', exact: true }).click();
    await dialog.getByRole('button', { name: '确定' }).click();
    await expect(dialog).toBeHidden();

    await searchUser(page, username);
    const updated = userRow(page, username);
    await expect(updated.getByText('编辑后')).toBeVisible();
    await expect(updated.getByText('禁用')).toBeVisible();

    await deleteUser(page, username);
  });

  test('批量删除选中用户', async ({ page }) => {
    const suffix = uniqueSuffix();
    const first = `e2e_batch1_${suffix}`;
    const second = `e2e_batch2_${suffix}`;
    await gotoUsers(page);
    await createUser(page, {
      username: first,
      password: 'e2e_pass123',
      role: 'Viewer',
    });
    await createUser(page, {
      username: second,
      password: 'e2e_pass123',
      role: 'Viewer',
    });

    await searchUser(page, `e2e_batch`);
    await expect(userRow(page, first)).toBeVisible();
    await expect(userRow(page, second)).toBeVisible();

    await checkUserRow(page, first);
    await checkUserRow(page, second);

    const batchButton = page.getByRole('button', { name: '批量删除' });
    await expect(batchButton).toBeEnabled();
    await batchButton.click();

    const dialog = page.getByRole('dialog', { name: '确认批量删除' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '确认删除' }).click();
    await expect(dialog).toBeHidden();

    await searchUser(page, `e2e_batch`);
    await expect(userRow(page, first)).toBeHidden();
    await expect(userRow(page, second)).toBeHidden();
  });

  test('批量启用禁用选中用户', async ({ page }) => {
    const username = `e2e_status_${uniqueSuffix()}`;
    await gotoUsers(page);
    await createUser(page, {
      username,
      password: 'e2e_pass123',
      role: 'Viewer',
    });

    await searchUser(page, username);
    const row = userRow(page, username);
    await expect(row).toBeVisible();
    await checkUserRow(page, username);

    await page.getByRole('button', { name: '批量禁用' }).click();
    let dialog = page.getByRole('dialog', { name: '确认批量禁用' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '确认禁用' }).click();
    await expect(dialog).toBeHidden();

    await searchUser(page, username);
    await expect(userRow(page, username).getByText('禁用')).toBeVisible();

    await checkUserRow(page, username);
    await page.getByRole('button', { name: '批量启用' }).click();
    dialog = page.getByRole('dialog', { name: '确认批量启用' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '确认启用' }).click();
    await expect(dialog).toBeHidden();

    await searchUser(page, username);
    await expect(userRow(page, username).getByText('正常')).toBeVisible();

    await deleteUser(page, username);
  });

  test('返回用户页后保留搜索和选中状态', async ({ page }) => {
    const username = `e2e_keep_${uniqueSuffix()}`;
    await gotoUsers(page);
    await createUser(page, {
      username,
      password: 'e2e_pass123',
      role: 'Viewer',
    });

    await searchUser(page, username);
    await checkUserRow(page, username);

    await page.goto('/roles');
    await expect(page.getByText('角色管理').first()).toBeVisible();
    await page.goto('/users');
    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue(username);
    await expect(userRow(page, username)).toBeVisible();
    await expect(userRow(page, username).getByRole('checkbox')).toBeChecked();

    await deleteUser(page, username);
  });

  test('命名视图保存筛选排序与列，切换和重载不恢复选择且按账号隔离', async ({ page, logout }) => {
    test.setTimeout(60_000);
    const signIn = async (account: string, password: string) => {
      await page.goto('/login');
      await page.getByRole('textbox', { name: '用户名', exact: true }).fill(account);
      await page.getByRole('textbox', { name: '密码', exact: true }).fill(password);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page).toHaveURL(/\/(dashboard|users)$/);
    };
    const username = `e2e_view_${uniqueSuffix()}`;
    await gotoUsers(page);
    await createUser(page, { username, password: 'e2e_pass123', role: 'Admin' });
    try {
      // InMemory API tests keep authentication records separate from management users.
      const registration = await page.request.post('/api/auth/register', {
        data: { username, password: 'e2e_pass123' },
      });
      expect(registration.ok()).toBe(true);
      await searchUser(page, 'admin');
      await page.getByRole('button', { name: /^按 用户名 排序/ }).click();
      await page.waitForLoadState('networkidle');
      await checkUserRow(page, 'admin');
      await page.getByRole('button', { name: '打开列设置' }).click();
      const createdAtColumn = page.getByRole('checkbox', { name: '创建时间', exact: true });
      await createdAtColumn.focus();
      await page.keyboard.press('Space');
      await expect(createdAtColumn).not.toBeChecked();
      await page.keyboard.press('Escape');
      await page.getByRole('textbox', { name: '视图名称', exact: true }).fill('管理员视图');
      await page.getByRole('button', { name: '保存视图', exact: true }).click();

      await searchUser(page, username);
      await page.getByRole('textbox', { name: '视图名称', exact: true }).fill('测试用户视图');
      await page.getByRole('button', { name: '保存视图', exact: true }).click();
      await checkUserRow(page, username);
      await page.getByRole('combobox', { name: '用户筛选视图' }).click();
      await page.getByRole('option', { name: '管理员视图', exact: true }).click();
      await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('admin');
      await expect(userRow(page, 'admin').getByRole('checkbox')).not.toBeChecked();
      await expect(page.getByRole('columnheader', { name: /创建时间/ })).toHaveCount(0);
      await expect(page.getByRole('columnheader', { name: /用户名/ })).toHaveAttribute('aria-sort', 'ascending');
      await checkUserRow(page, 'admin');
      await page.reload();
      await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('admin');
      await expect(userRow(page, 'admin').getByRole('checkbox')).not.toBeChecked();
      const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('tigercat.admin.workbench.users.admin.views') || 'null'));
      expect(snapshot.views).toHaveLength(2);
      expect(snapshot.views[0]).not.toHaveProperty('selectedRowKeys');
      expect(snapshot.views[0].queryState).not.toHaveProperty('page');

      await logout();
      await signIn(username, 'e2e_pass123');
      await gotoUsers(page);
      await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('');
      await page.getByRole('combobox', { name: '用户筛选视图' }).click();
      await expect(page.getByRole('option', { name: '管理员视图', exact: true })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await page.getByRole('textbox', { name: '视图名称', exact: true }).fill('其他账号视图');
      await page.getByRole('button', { name: '保存视图', exact: true }).click();
      await page.getByRole('banner').getByRole('button', { name: username, exact: true }).click();
      await page.getByText('退出登录', { exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      await signIn('admin', 'admin123');
      await gotoUsers(page);
      await expect(page.getByRole('combobox', { name: '用户筛选视图' })).toContainText('管理员视图');
      await page.getByRole('combobox', { name: '用户筛选视图' }).click();
      await page.getByRole('option', { name: '测试用户视图', exact: true }).click();
      await page.getByRole('button', { name: '删除视图', exact: true }).click();
      await page.reload();
      await page.getByRole('combobox', { name: '用户筛选视图' }).click();
      await expect(page.getByRole('option', { name: '测试用户视图', exact: true })).toHaveCount(0);
      await expect(page.getByRole('option', { name: '管理员视图', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    } finally {
      if (!page.isClosed()) {
        const account = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.username, SESSION_KEY);
        if (account !== 'admin') {
          await page.evaluate(key => localStorage.removeItem(key), SESSION_KEY);
          await signIn('admin', 'admin123');
        }
        await gotoUsers(page);
        await deleteUser(page, username);
      }
    }
  });

  test('批量状态请求失败保留选择与确认框，取消不提交且可以重试', async ({ page }) => {
    const username = `e2e_retry_${uniqueSuffix()}`;
    await gotoUsers(page);
    await createUser(page, { username, password: 'e2e_pass123', role: 'Viewer' });
    let attempts = 0;
    await page.route('**/api/users/batch-status', async route => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 500, json: { success: false, message: '批量操作暂时失败' } });
      } else {
        await route.continue();
      }
    });
    try {
      await searchUser(page, username);
      await checkUserRow(page, username);
      await page.getByRole('button', { name: '批量禁用', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '确认批量禁用' });
      await dialog.getByRole('button', { name: '确认禁用', exact: true }).click();
      await expect(page.getByText('批量操作暂时失败', { exact: true })).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(userRow(page, username).getByRole('checkbox')).toBeChecked();
      await dialog.getByRole('button', { name: '取消', exact: true }).click();
      await expect(dialog).toBeHidden();
      expect(attempts).toBe(1);
      await page.getByRole('button', { name: '批量禁用', exact: true }).click();
      await dialog.getByRole('button', { name: '确认禁用', exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(userRow(page, username).getByText('禁用', { exact: true })).toBeVisible();
      await expect(userRow(page, username).getByRole('checkbox')).not.toBeChecked();
      expect(attempts).toBe(2);
    } finally {
      await page.unroute('**/api/users/batch-status');
      await deleteUser(page, username);
    }
  });
});
