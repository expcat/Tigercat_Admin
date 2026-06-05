import { expect, SESSION_KEY, test, uniqueSuffix } from './fixtures/auth';
import type { Page } from '@playwright/test';

type UploadedMedia = {
  id: number;
  fileName: string;
  url: string;
};

async function createTestTask(page: Page, label: string) {
  return page.evaluate(
    async ({ key, label }) => {
      const session = JSON.parse(window.localStorage.getItem(key) || 'null') as
        | { token?: string }
        | null;
      if (!session?.token) {
        throw new Error('Missing admin session');
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `P6 完成确认 ${label}`,
          description: 'E2E 创建的任务详情与完成确认用例。',
          assignee: 'E2E',
          priority: 'medium',
          status: 'review',
          dueAt: new Date(Date.now() + 86400000).toISOString(),
          estimateHours: 1,
          blocked: false,
          blockedReason: null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `Create task failed: ${response.status}`);
      }

      return payload.data as { id: string; title: string };
    },
    { key: SESSION_KEY, label },
  );
}

async function uploadTestMedia(page: Page, label: string): Promise<UploadedMedia> {
  const fileName = `p5-${label}-${uniqueSuffix()}.txt`;
  const media = await page.evaluate(
    async ({ key, fileName, label }) => {
      const session = JSON.parse(window.localStorage.getItem(key) || 'null') as
        | { token?: string }
        | null;
      if (!session?.token) {
        throw new Error('Missing admin session');
      }

      const form = new FormData();
      form.append('file', new Blob([`P7 media smoke ${label} ${Date.now()}`], { type: 'text/plain' }), fileName);
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

      return payload.data as { id: number; url: string };
    },
    { key: SESSION_KEY, fileName, label },
  );

  return { id: media.id, fileName, url: media.url };
}

async function createReferencedLogo(page: Page, label: string): Promise<UploadedMedia> {
  const fileName = `p7-logo-${label}-${uniqueSuffix()}.png`;
  const media = await page.evaluate(
    async ({ key, fileName, label }) => {
      const session = JSON.parse(window.localStorage.getItem(key) || 'null') as
        | { token?: string }
        | null;
      if (!session?.token) {
        throw new Error('Missing admin session');
      }

      const form = new FormData();
      form.append('file', new Blob([`P7 logo smoke ${fileName}`], { type: 'image/png' }), fileName);
      form.append('usage', 'logo');

      const uploadResponse = await fetch('/api/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: form,
      });
      const uploadPayload = await uploadResponse.json();
      if (!uploadResponse.ok || uploadPayload?.success === false) {
        throw new Error(uploadPayload?.message || `Upload failed: ${uploadResponse.status}`);
      }

      const media = uploadPayload.data as { id: number; url: string };
      const settingsResponse = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: [{ key: 'site.logo', value: media.url }] }),
      });
      const settingsPayload = await settingsResponse.json();
      if (!settingsResponse.ok || settingsPayload?.success === false) {
        throw new Error(settingsPayload?.message || `Settings failed: ${settingsResponse.status}`);
      }

      return media;
    },
    { key: SESSION_KEY, fileName, label },
  );

  return { id: media.id, fileName, url: media.url };
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

  test('通知点击可跳转到关联运维页面', async ({ page }) => {
    await page.goto('/notifications');

    await page.getByText('发布窗口确认').first().click();
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.getByRole('main').getByText('任务面板')).toBeVisible();
  });

  test('任务面板加载后端任务模型', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page.getByText('当前任务来自后端模型')).toBeVisible();
    await expect(page.getByText('补齐媒体资源持久化方案')).toBeVisible();
    await expect(page.getByText('任务总数')).toBeVisible();
  });

  test('任务详情支持完成确认', async ({ page }) => {
    const task = await createTestTask(page, uniqueSuffix());

    await page.goto(`/tasks?taskId=${encodeURIComponent(task.id)}`);
    const dialog = page.getByRole('dialog', { name: '任务详情' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(task.title)).toBeVisible();
    await dialog.getByPlaceholder('完成说明').fill('E2E 验收完成');
    await dialog.getByRole('button', { name: '确认完成' }).click();
    await expect(dialog.getByText('done')).toBeVisible();
    await expect(dialog.getByText('E2E 验收完成')).toBeVisible();
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
    await page.getByRole('button', { name: '预览清理' }).click();
    await expect(
      page.getByText(/当前保留|审计日志暂时不可用/).first(),
    ).toBeVisible();
  });

  test('文件页支持批量删除临时媒体', async ({ page }) => {
    const first = await uploadTestMedia(page, 'batch-a');
    const second = await uploadTestMedia(page, 'batch-b');

    try {
      await page.goto('/files');
      await expect(page.getByText('文件管理').first()).toBeVisible();
      const firstOption = page.getByRole('option', { name: new RegExp(first.fileName) });
      await firstOption.click();
      await page.getByRole('button', { name: '查看详情' }).click();
      const detailDialog = page.getByRole('dialog', { name: '媒体详情' });
      await expect(detailDialog).toBeVisible();
      await expect(detailDialog.getByText('SHA256')).toBeVisible();
      await detailDialog.getByRole('button', { name: '复制 URL' }).click();
      await page.keyboard.press('Escape');
      await expect(detailDialog).toBeHidden();

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
      const missing = await page.evaluate(async (url) => fetch(url).then((response) => response.status), first.url);
      expect(missing).toBe(404);
    } finally {
      await deleteTestMedia(page, first.id);
      await deleteTestMedia(page, second.id);
    }
  });

  test('文件页展示引用影响并支持强制删除已知引用', async ({ page }) => {
    const logo = await createReferencedLogo(page, 'force');

    await page.goto('/files');
    await expect(page.getByText('文件管理').first()).toBeVisible();
    await page.getByRole('option', { name: new RegExp(logo.fileName) }).click();
    await page.getByRole('button', { name: '删除选中' }).click();
    const dialog = page.getByRole('dialog', { name: '确认删除文件' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('站点 Logo')).toBeVisible();
    await expect(dialog.getByText('强制删除并清理已知 Logo / 头像引用')).toBeVisible();
    await dialog.getByRole('button', { name: '强制删除' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('option', { name: new RegExp(logo.fileName) })).toHaveCount(0);
  });
});
