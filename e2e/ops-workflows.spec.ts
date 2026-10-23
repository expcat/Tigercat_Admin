import { readFile } from 'node:fs/promises';
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

  test('Jobs 配置新建、编辑和启停可刷新恢复', async ({ page }) => {
    const name = `UP09-${uniqueSuffix()}`;
    await page.goto('/jobs');
    await expect(page.getByText('任务配置展示', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '新建任务', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: '新建任务' });
    await drawer.getByRole('textbox', { name: '任务名称', exact: true }).fill(name);
    // 语法合法但没有下次时间，仍可作为展示配置保存。
    await drawer.getByRole('textbox', { name: 'Cron 表达式', exact: true }).fill('0 0 31 2 *');
    await drawer.getByRole('button', { name: '创建任务', exact: true }).click();
    await expect(drawer).toBeHidden();
    const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: `查看任务：${name}`, exact: true }) });
    await expect(row.getByText('0 0 31 2 *', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: '编辑', exact: true }).click();
    const edit = page.getByRole('dialog', { name: '编辑任务' });
    await edit.getByRole('textbox', { name: '超时时间', exact: true }).fill('展示值');
    await edit.getByRole('button', { name: '保存修改', exact: true }).click();
    await expect(edit).toBeHidden();
    const toggle = row.getByRole('switch');
    await expect(toggle).toBeEnabled();
    await toggle.press('Space');
    await expect(toggle).not.toBeChecked();
    await expect(toggle).toBeEnabled();
    await page.reload();
    await expect(toggle).not.toBeChecked();
    await row.getByRole('button', { name: '编辑', exact: true }).click();
    await expect(edit.getByRole('textbox', { name: '超时时间', exact: true })).toHaveValue('展示值');
    await edit.getByRole('button', { name: '取消', exact: true }).click();
    await toggle.press('Space');
    await expect(toggle).toBeChecked();
  });

  test('Jobs 校验和读写失败可恢复且不丢失配置', async ({ page }) => {
    let failGet = true;
    let failPost = true;
    let failPut = true;
    let posts = 0;
    await page.route(/\/api\/jobs(?:\/[^/?]+)?(?:\?.*)?$/, async route => {
      const method = route.request().method();
      if (method === 'POST') posts += 1;
      const fail = method === 'GET' ? failGet : method === 'POST' ? failPost : method === 'PUT' && failPut;
      if (fail) await route.fulfill({ status: 503, json: { success: false, message: 'UP09 请求失败' } });
      else await route.continue();
    });
    await page.goto('/jobs');
    await expect(page.getByText('UP09 请求失败', { exact: true })).toBeVisible();
    failGet = false;
    await page.getByRole('button', { name: '重试任务列表', exact: true }).click();
    await page.getByRole('button', { name: '新建任务', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: '新建任务' });
    const create = drawer.getByRole('button', { name: '创建任务', exact: true });
    await create.click();
    await expect(drawer.getByRole('textbox', { name: '任务名称', exact: true })).toBeFocused();
    const name = `UP09-failure-${uniqueSuffix()}`;
    await drawer.getByRole('textbox', { name: '任务名称', exact: true }).fill(name);
    await drawer.getByRole('textbox', { name: 'Cron 表达式', exact: true }).fill('invalid cron');
    await create.click();
    await expect(drawer.getByText('请填写有效的 5 段 Cron 表达式，且不能超过 64 字', { exact: true })).toBeVisible();
    expect(posts).toBe(0);
    await drawer.getByRole('textbox', { name: 'Cron 表达式', exact: true }).fill('0 2 * * *');
    const minute = drawer.getByRole('textbox', { name: '分钟值', exact: true });
    await minute.fill('bad');
    await create.click();
    await expect(minute).toBeFocused();
    expect(posts).toBe(0);
    await drawer.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByRole('button', { name: '新建任务', exact: true }).click();
    await expect(minute).toHaveValue('0');
    await expect(drawer.getByRole('textbox', { name: 'Cron 表达式', exact: true })).toHaveValue('0 2 * * *');
    await drawer.getByRole('textbox', { name: '任务名称', exact: true }).fill(name);
    await create.click();
    await expect(drawer.getByText('UP09 请求失败', { exact: true })).toBeVisible();
    await expect(drawer.getByRole('textbox', { name: '任务名称', exact: true })).toHaveValue(name);
    failPost = false;
    await create.click();
    await expect(drawer).toBeHidden();
    const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: `查看任务：${name}`, exact: true }) });
    await expect(row.getByRole('switch')).toBeEnabled();
    await row.getByRole('switch').press('Space');
    await expect(page.getByText('UP09 请求失败', { exact: true })).toBeVisible();
    await expect(row.getByRole('switch')).toBeChecked();
    await row.getByRole('button', { name: '编辑', exact: true }).click();
    const edit = page.getByRole('dialog', { name: '编辑任务' });
    await edit.getByRole('textbox', { name: '超时时间', exact: true }).fill('120');
    await edit.getByRole('button', { name: '保存修改', exact: true }).click();
    await expect(edit.getByText('UP09 请求失败', { exact: true })).toBeVisible();
    await expect(edit.getByRole('textbox', { name: '超时时间', exact: true })).toHaveValue('120');
    failPut = false;
    await edit.getByRole('button', { name: '保存修改', exact: true }).click();
    await expect(edit).toBeHidden();
  });

  test('用户 CSV 实际导入、结果刷新与失败行下载', async ({ page }) => {
    const username = `csv_${uniqueSuffix()}`;
    const password = 'ImportSecret42!';
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('/import');
    await page.getByLabel('选择 UTF-8 CSV 文件').setInputFiles({ name: 'users.csv', mimeType: 'text/csv', buffer: Buffer.from(
      `\uFEFFusername,password,displayName,roleIds\r\n${username},${password},"Alice, ""A""\r\nTeam",1\r\nadmin,${password},Existing,\r\nbad_${username},x,Invalid,`) });
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    await page.getByRole('button', { name: '校验并预览', exact: true }).click();
    await expect(page.getByText('校验通过 1，跳过 1，失败 1', { exact: true })).toBeVisible();
    await expect(page.getByText(password, { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '开始导入', exact: true }).click();
    await expect(page).toHaveURL(/\/import\/IMP-/);
    await page.reload();
    await expect(page.getByText('导入完成 · 已处理 3/3 行', { exact: true })).toBeVisible();
    await expect(page.getByText('成功', { exact: true }).first()).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.getByRole('button', { name: '下载失败行', exact: true }).click(),
    ]);
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv).toContain(`"bad_${username}","","Invalid"`);
    expect(csv).not.toContain(password);
    expect(csv).toContain('密码长度不能少于');
    const user = await page.evaluate(async ({ username, key }) => {
      const session = JSON.parse(localStorage.getItem(key)!);
      const response = await fetch(`/api/users?keyword=${encodeURIComponent(username)}`, { headers: { Authorization: `Bearer ${session.token}` } });
      const payload = await response.json();
      return payload.data.items.find((item: { username: string }) => item.username === username);
    }, { username, key: SESSION_KEY });
    expect(user.status).toBe(0);
    expect(user.displayName).toBe('Alice, "A"\r\nTeam');
    expect(user.roles.map((role: { id: number }) => role.id)).toContain(1);
    expect(pageErrors).toEqual([]);
  });

  test('通知中心加载后端通知并展示分组统计', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page.getByText(/条共享通知，当前加载前/)).toBeVisible();
    await expect(page.getByText('发布窗口确认').first()).toBeVisible();
    await expect(page.getByText('当前加载未读')).toBeVisible();
  });

  test('通知点击可跳转到关联运维页面', async ({ page }) => {
    await page.goto('/notifications');

    await page.getByText('发布窗口确认').first().click();
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.locator('#main-content-scroll').getByRole('heading', { name: /^任务面板/ })).toBeVisible();
  });

  test('任务面板加载后端任务模型', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page.getByText('当前任务来自后端模型')).toBeVisible();
    await expect(page.getByText('补齐媒体资源持久化方案')).toBeVisible();
    await expect(page.getByText('任务总数')).toBeVisible();
  });

  test('任务详情支持完成确认', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const task = await createTestTask(page, uniqueSuffix());

    await page.goto('/tasks');
    await page.getByPlaceholder('负责人（包含匹配）').fill(`missing-${task.id}`);
    await expect(page.getByText('没有符合条件的任务。')).toBeVisible();
    // 同页改变目标，详情应独立于当前筛选列表读取。
    await page.evaluate((id) => {
      window.history.pushState({}, '', `/tasks?taskId=${encodeURIComponent(id)}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, task.id);
    const dialog = page.getByRole('dialog', { name: '任务详情' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(task.title)).toBeVisible();
    await dialog.getByPlaceholder('完成说明').fill('E2E 验收完成');
    await dialog.getByRole('button', { name: '确认完成' }).click();
    await expect(dialog.getByText('done')).toBeVisible();
    await expect(dialog.getByText('E2E 验收完成')).toBeVisible();
    await page.reload();
    await expect(dialog.getByText('done')).toBeVisible();
    await expect(dialog.getByText('E2E 验收完成')).toBeVisible();
    await dialog.getByText('关闭', { exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(pageErrors).toEqual([]);
  });

  test('任务详情错误可重试且不显示上一个目标', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const task = await createTestTask(page, uniqueSuffix());
    await page.goto(`/tasks?taskId=${encodeURIComponent(task.id)}`);
    const dialog = page.getByRole('dialog', { name: '任务详情' });
    await expect(dialog.getByText(task.title)).toBeVisible();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/tasks?taskId=up05-missing');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(dialog.getByText(/任务不存在或已被移除/)).toBeVisible();
    await expect(dialog.getByText(task.title)).toHaveCount(0);
    await page.route('**/api/tasks/up05-missing', (route) => route.fulfill({
      status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, code: 500, message: 'UP05 临时故障' }),
    }));
    await dialog.getByRole('button', { name: '重试任务详情' }).click();
    await expect(dialog.getByText(/UP05 临时故障/)).toBeVisible();
    await dialog.getByText('关闭', { exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(pageErrors).toEqual([]);
  });

  test('审计页提供筛选导出和保留策略入口', async ({ page }) => {
    await page.goto('/audit-logs');

    await expect(page.getByText('审计事件查询')).toBeVisible();
    await expect(page.getByRole('button', { name: '导出 CSV' })).toBeVisible();
    await page.getByRole('button', { name: '导出 CSV' }).click();
    await expect(
      page.getByText(/当前筛选没有可导出的结果|审计日志暂时不可用|导出失败/).first(),
    ).toBeVisible();
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
      await expect(page).toHaveURL(new RegExp(`/files/${first.id}$`));
      await expect(page.getByText('SHA256', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: '复制 URL', exact: true }).click();
      await page.getByRole('button', { name: '返回文件管理' }).click();
      await expect(firstOption).toBeVisible();

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
    await expect(dialog.getByText('强制删除并清理已知 Logo / 头像 / 文章附件引用')).toBeVisible();
    const forceCheckbox = dialog.getByRole('checkbox', { name: '强制删除并清理已知 Logo / 头像 / 文章附件引用' });
    await forceCheckbox.focus();
    await forceCheckbox.press('Space');
    await expect(forceCheckbox).toBeChecked();
    await dialog.getByRole('button', { name: '强制删除' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('option', { name: new RegExp(logo.fileName) })).toHaveCount(0);
  });
});
