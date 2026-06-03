import { escapeRegExp, expect, test, uniqueSuffix } from './fixtures/auth';
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
    await dialog.getByRole('button', { name: '请选择角色（可多选）' }).click();
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
  await row.getByRole('button', { name: '删除', exact: true }).click();
  await page
    .getByRole('dialog', { name: '确认删除用户' })
    .getByRole('button', { name: '删除' })
    .click();
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
    await dialog.getByRole('button', { name: '正常' }).click();
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

    await userRow(page, first).getByRole('checkbox').check();
    await userRow(page, second).getByRole('checkbox').check();

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
});
