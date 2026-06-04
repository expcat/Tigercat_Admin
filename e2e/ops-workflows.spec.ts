import { expect, SESSION_KEY, test, uniqueSuffix } from './fixtures/auth';
import type { Page } from '@playwright/test';

type UploadedMedia = {
  id: number;
  fileName: string;
};

async function uploadTestMedia(page: Page, label: string): Promise<UploadedMedia> {
  const fileName = `p5-${label}-${uniqueSuffix()}.txt`;
  const media = await page.evaluate(
    async ({ key, fileName }) => {
      const session = JSON.parse(window.localStorage.getItem(key) || 'null') as
        | { token?: string }
        | null;
      if (!session?.token) {
        throw new Error('Missing admin session');
      }

      const form = new FormData();
      form.append('file', new Blob(['P5 workbench smoke'], { type: 'text/plain' }), fileName);
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
    await page.getByRole('button', { name: '导出 CSV' }).click();
    const exportDialog = page.getByRole('dialog', { name: '确认导出审计日志' });
    await expect(exportDialog).toBeVisible();
    await exportDialog.getByRole('button', { name: '取消' }).click();
    await expect(exportDialog).toBeHidden();
    await page.getByRole('button', { name: '保存策略' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: '保存策略' })).toBeVisible();
  });

  test('文件页支持批量删除临时媒体', async ({ page }) => {
    const first = await uploadTestMedia(page, 'batch-a');
    const second = await uploadTestMedia(page, 'batch-b');

    try {
      await page.goto('/files');
      await expect(page.getByText('文件管理').first()).toBeVisible();
      await page.getByRole('option', { name: new RegExp(first.fileName) }).click();
      await page.getByRole('option', { name: new RegExp(second.fileName) }).click();

      const deleteButton = page.getByRole('button', { name: '删除选中' });
      await expect(deleteButton).toBeEnabled();
      await deleteButton.click();
      const dialog = page.getByRole('dialog', { name: '确认删除文件' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: '确认删除' }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole('option', { name: new RegExp(first.fileName) })).toHaveCount(0);
      await expect(page.getByRole('option', { name: new RegExp(second.fileName) })).toHaveCount(0);
    } finally {
      await deleteTestMedia(page, first.id);
      await deleteTestMedia(page, second.id);
    }
  });
});
