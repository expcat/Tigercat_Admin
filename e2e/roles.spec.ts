import { escapeRegExp, expect, test, uniqueSuffix } from './fixtures/auth';
import type { Page } from '@playwright/test';

const SEARCH_PLACEHOLDER = '搜索角色名称或描述...';

async function gotoRoles(page: Page) {
  await page.goto('/roles');
  await expect(page.getByRole('button', { name: '新增角色' })).toBeVisible();
}

async function searchRole(page: Page, keyword: string) {
  await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(keyword);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  // 列表异步刷新，等待网络空闲，避免下拉菜单在表格重渲染时被卸载（detached）。
  await page.waitForLoadState('networkidle');
}

function roleRow(page: Page, name: string) {
  return page.getByRole('row', { name: new RegExp(escapeRegExp(name)) });
}

async function createRole(
  page: Page,
  options: { name: string; description?: string },
) {
  await page.getByRole('button', { name: '新增角色' }).click();
  const dialog = page.getByRole('dialog', { name: '新增角色' });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/请输入角色名称/).fill(options.name);
  if (options.description) {
    await dialog.getByPlaceholder(/请输入角色描述/).fill(options.description);
  }
  await dialog.getByRole('button', { name: '确定' }).click();
  await expect(dialog).toBeHidden();
}

async function deleteRole(page: Page, name: string) {
  await searchRole(page, name);
  const row = roleRow(page, name);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '删除', exact: true }).click();
  await page
    .getByRole('dialog', { name: '确认删除角色' })
    .getByRole('button', { name: '删除' })
    .click();
  await expect(row).toBeHidden();
}

test.describe('角色与权限主流程', () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin();
  });

  test('创建角色后可检索并删除', async ({ page }) => {
    const name = `e2e_role_${uniqueSuffix()}`;
    await gotoRoles(page);

    await createRole(page, { name, description: 'E2E 角色描述' });

    await searchRole(page, name);
    const row = roleRow(page, name);
    await expect(row).toBeVisible();
    await expect(row.getByText('E2E 角色描述')).toBeVisible();
    await expect(row.getByText('0 项')).toBeVisible();

    await deleteRole(page, name);
  });

  test('编辑角色可更新描述', async ({ page }) => {
    const name = `e2e_roleedit_${uniqueSuffix()}`;
    await gotoRoles(page);
    await createRole(page, { name, description: '描述前' });

    await searchRole(page, name);
    const row = roleRow(page, name);
    await row.getByRole('button', { name: '操作' }).click();
    await page.getByRole('menuitem', { name: '编辑角色' }).click();

    const dialog = page.getByRole('dialog', { name: '编辑角色' });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/请输入角色描述/).fill('描述后');
    await dialog.getByRole('button', { name: '确定' }).click();
    await expect(dialog).toBeHidden();

    await searchRole(page, name);
    await expect(roleRow(page, name).getByText('描述后')).toBeVisible();

    await deleteRole(page, name);
  });

  test('配置角色权限并持久化', async ({ page }) => {
    const name = `e2e_roleperm_${uniqueSuffix()}`;
    await gotoRoles(page);
    await createRole(page, { name, description: '权限配置测试' });

    await searchRole(page, name);
    const row = roleRow(page, name);
    await expect(row.getByText('0 项')).toBeVisible();

    await row.getByRole('button', { name: '操作' }).click();
    await page.getByRole('menuitem', { name: '权限配置' }).click();

    const dialog = page.getByRole('dialog', { name: /权限配置/ });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('checkbox', { name: 'Select 查看仪表盘 (dashboard:view)' })
      .check();
    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('权限配置已保存').first()).toBeVisible();

    await searchRole(page, name);
    await expect(roleRow(page, name).getByText('1 项')).toBeVisible();

    await deleteRole(page, name);
  });

  test('系统管理员角色受保护无法删除', async ({ page }) => {
    await gotoRoles(page);
    await searchRole(page, 'Admin');

    const row = roleRow(page, 'Admin');
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: '删除', exact: true }).click();
    await page
      .getByRole('dialog', { name: '确认删除角色' })
      .getByRole('button', { name: '删除' })
      .click();

    await expect(page.getByText('不能删除管理员角色').first()).toBeVisible();
    await expect(roleRow(page, 'Admin')).toBeVisible();
  });
});
