import { expect, test } from './fixtures/auth';

test.describe('运维工作流后端化页面', () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin();
  });

  test('通知中心加载后端通知并展示分组统计', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page.getByText('通知来自后端数据源')).toBeVisible();
    await expect(page.getByText('发布窗口确认').first()).toBeVisible();
    await expect(page.getByText('未读总数')).toBeVisible();
  });

  test('任务面板加载后端任务模型', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page.getByText('当前任务来自后端模型')).toBeVisible();
    await expect(page.getByText('补齐媒体资源持久化方案')).toBeVisible();
    await expect(page.getByText('任务总数')).toBeVisible();
  });

  test('审计页提供筛选导出和保留策略入口', async ({ page }) => {
    await page.goto('/audit-logs');

    await expect(page.getByText('审计事件查询')).toBeVisible();
    await expect(page.getByRole('button', { name: '导出 CSV' })).toBeVisible();
    await page.getByRole('button', { name: '保存策略' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: '保存策略' })).toBeVisible();
  });
});
