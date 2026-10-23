import { expect, SESSION_KEY, test, uniqueSuffix } from './fixtures/auth';

test('工作台分别显示真实范围并打开原任务、通知、审批和日程详情', async ({ page, loginAsAdmin }) => {
  await loginAsAdmin();
  const seeded = await page.evaluate(async ({ sessionKey, suffix }) => {
    const session = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    const create = async (path: string, body: object) => {
      const response = await fetch(path, {
        method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Seed failed: ${path} ${response.status}`);
      return (await response.json()).data;
    };
    const tasks = [];
    for (let i = 0; i < 7; i++) tasks.push(await create('/api/tasks', {
      title: `UP11 ${suffix} ${i}`, assignee: i % 2 ? 'ADMIN' : 'admin', status: 'backlog', dueAt: '2000-01-01T00:00:00Z',
    }));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const event = await create('/api/calendar/events', { date, start: '00:00', end: '00:30', title: `UP11 日程 ${suffix}`, type: 'meeting', location: '会议室' });
    const notification = await create('/api/notifications', { groupKey: 'ops', title: `UP11 通知 ${suffix}`, description: '共享未读通知', toastType: 'info', linkUrl: `/tasks?taskId=${tasks[0].id}` });
    return { tasks, event, notification };
  }, { sessionKey: SESSION_KEY, suffix: uniqueSuffix() });

  await page.goto('/workspace');
  await expect(page.getByRole('heading', { name: '我的工作台', exact: true })).toBeVisible();
  const tasks = page.getByRole('region', { name: '用户名匹配的待办', exact: true });
  const notifications = page.getByRole('region', { name: '全局未读通知', exact: true });
  const calendar = page.getByRole('region', { name: '团队近期日程', exact: true });
  const approvals = page.getByRole('region', { name: '演示审批待办', exact: true });
  await expect(tasks.getByRole('listitem')).toHaveCount(5);
  await expect(tasks.getByRole('status')).toHaveText(/显示 5 \/ 共 (?:[7-9]|\d{2,}) 条/);
  await expect(approvals.getByText(/独立演示审批身份：/)).toBeVisible();
  const taskLink = tasks.getByRole('listitem').first().getByRole('link');
  const taskTitle = await taskLink.innerText();
  await taskLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/tasks\?taskId=/);
  await expect(page.getByRole('dialog', { name: /任务详情/ })).toContainText(taskTitle);

  await page.goto('/workspace');
  let readWrites = 0;
  page.on('request', request => { if (/\/api\/notifications\/.*read/.test(request.url()) && request.method() !== 'GET') readWrites++; });
  await notifications.getByRole('link', { name: seeded.notification.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`taskId=${seeded.tasks[0].id}$`));
  expect(readWrites).toBe(0);

  await page.goto('/workspace');
  await approvals.getByRole('listitem').first().getByRole('link').click();
  await expect(page).toHaveURL(/\/approvals\/[^/]+$/);
  await expect(page.getByText('申请表单', { exact: true })).toBeVisible();

  await page.goto('/workspace');
  await calendar.getByRole('link', { name: seeded.event.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`date=${seeded.event.date}&eventId=${seeded.event.id}$`));
  const trigger = page.locator(`[data-calendar-event="${seeded.event.id}"]`);
  await expect(trigger).toBeFocused();
  await expect(page.getByText(`地点：${seeded.event.location}`, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByText(`地点：${seeded.event.location}`, { exact: true })).toBeHidden();
  await page.reload();
  await expect(trigger).toBeFocused();
  await expect(page.getByText(`地点：${seeded.event.location}`, { exact: true })).toBeVisible();
});

test('工作台单块失败可重试，缺权不请求，未知演示身份不冒充零待办', async ({ page, loginAsAdmin }) => {
  await loginAsAdmin();
  let tasksUnavailable = true;
  await page.route('**/api/tasks?**', route => tasksUnavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, code: 503, message: 'UP11 任务暂不可用' }) })
    : route.continue());
  await page.goto('/workspace');
  const tasks = page.getByRole('region', { name: '用户名匹配的待办', exact: true });
  await expect(tasks.getByRole('alert')).toContainText('UP11 任务暂不可用');
  await expect(page.getByRole('region', { name: '团队近期日程', exact: true }).getByRole('status')).toContainText('显示');
  tasksUnavailable = false;
  await tasks.getByRole('button', { name: '重试用户名匹配的待办' }).click();
  await expect(tasks.getByRole('status')).toContainText('显示');

  await page.route('**/api/auth/permissions', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.permissions = body.data.permissions.filter((permission: { code: string }) => !['task:view', 'notification:view'].includes(permission.code));
    await route.fulfill({ response, json: body });
  });
  await page.evaluate(() => localStorage.setItem('tigercat-admin:approval-actor', 'up11-unknown'));
  const protectedRequests: string[] = [];
  page.on('request', request => {
    if (/\/api\/(tasks|notifications|approvals)\?/.test(request.url())) protectedRequests.push(request.url());
  });
  await page.reload();
  await expect(tasks.getByText('需要 task:view 权限，未请求此数据。')).toBeVisible();
  await expect(page.getByText('需要 notification:view 权限，未请求此数据。')).toBeVisible();
  const approvals = page.getByRole('region', { name: '演示审批待办', exact: true });
  await expect(approvals.getByText(/未匹配审批通讯录，未读取审批待办/)).toBeVisible();
  await expect(approvals.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '通知', exact: true })).toHaveCount(0);
  expect(protectedRequests).toEqual([]);
});
