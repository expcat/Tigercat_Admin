import { expect, test, uniqueSuffix } from './fixtures/auth';

test.describe('菜单管理轻页', () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin();
  });

  test('可打开页面、创建节点并按角色预览', async ({ page }) => {
    await page.goto('/menus');
    await expect(page.getByText('菜单管理', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('tree', { name: '菜单树' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新增节点' })).toBeVisible();

    const key = `n${uniqueSuffix()}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    const label = `预览节点${key.slice(-4)}`;

    await page.getByRole('button', { name: '新增节点' }).click();
    const dialog = page.getByRole('dialog', { name: '新增菜单节点' });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('例如 reports').fill(key);
    await dialog.getByPlaceholder('请输入显示名').fill(label);
    await dialog.getByRole('button', { name: '确定' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('tree', { name: '菜单树' }).getByText(label)).toBeVisible();

    const previewSelect = page.getByRole('combobox').filter({ hasText: /选择角色预览/ });
    if (await previewSelect.count() === 0) {
      await page.getByText('选择角色预览').click();
    } else {
      await previewSelect.first().click();
    }
    const viewer = page.getByRole('option', { name: 'Viewer' });
    await expect(viewer).toBeVisible();
    await viewer.click();
    await expect(page.getByText(/条路由记录/)).toBeVisible();

    await page.getByRole('tree', { name: '菜单树' }).getByText(label).click();
    await page.getByRole('button', { name: '删除' }).click();
    const confirm = page.getByRole('tooltip').or(page.getByRole('dialog')).filter({
      hasText: '确认删除菜单节点',
    });
    if (await confirm.first().isVisible().catch(() => false)) {
      await confirm.first().getByRole('button', { name: '删除' }).click();
    }
  });
});
