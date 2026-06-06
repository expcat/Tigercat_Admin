import { expect, test } from './fixtures/auth';

test.describe('Debug menu collapse behavior', () => {
  test('React collapsed menu expand downwards', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    
    // Collapse sidebar
    await page.getByRole('button', { name: '关闭导航菜单' }).click();
    await page.waitForTimeout(500);

    // Click '系统管理' to expand it downwards
    await page.getByRole('menuitem', { name: '系统管理' }).click();
    await page.waitForTimeout(500);

    const userManagement = page.getByRole('menuitem', { name: '用户管理' });
    const isUserManagementVisible = await userManagement.isVisible();
    expect(isUserManagementVisible).toBe(true);
  });

  test('Vue collapsed menu expand downwards', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    
    // Collapse sidebar
    await page.getByRole('button', { name: '关闭导航菜单' }).click();
    await page.waitForTimeout(500);

    // Click '系统管理' to expand it downwards
    await page.getByRole('menuitem', { name: '系统管理' }).click();
    await page.waitForTimeout(500);

    const userManagement = page.getByRole('menuitem', { name: '用户管理' });
    const isUserManagementVisible = await userManagement.isVisible();
    expect(isUserManagementVisible).toBe(true);
  });
});



