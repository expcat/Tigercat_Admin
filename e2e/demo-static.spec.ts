import { expect, test } from '@playwright/test';

async function login(
  page: import('@playwright/test').Page,
  options: { withTour?: boolean } = {},
) {
  // 默认抑制首次登录新手引导，避免其遮罩干扰其它用例的交互。
  if (!options.withTour) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('tigercat-admin:onboarding-tour:done', '1');
      } catch {
        /* ignore storage errors */
      }
    });
  }
  await page.goto('/#/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page.getByText('演示模式', { exact: true })).toBeVisible();
}

test.describe('静态演示模式', () => {
  test('无需 API 即可登录并浏览核心页面', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    for (const [path, text] of [
      ['users', '用户管理'],
      ['roles', '角色管理'],
      ['settings', '系统设置'],
      ['notifications', '通知中心'],
      ['tasks', '任务面板'],
      ['files', '文件管理'],
      ['audit-logs', '审计日志'],
    ] as const) {
      await page.goto(`/#/${path}`);
      await expect(page.getByText(text).first()).toBeVisible();
      await expect(page.getByText('演示模式', { exact: true })).toBeVisible();
    }

    await page.goto('/#/users');
    await page.reload();
    await expect(page.getByText('用户管理').first()).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('演示写操作在会话内给出反馈', async ({ page }) => {
    await login(page);

    await page.goto('/#/notifications');
    await expect(page.getByText('发布窗口确认').first()).toBeVisible();

    await page.goto('/#/settings');
    const siteName = page.getByPlaceholder('输入 site.name 的值');
    await expect(siteName).toHaveValue('Tigercat Admin');
    await siteName.fill('Tigercat Admin Demo');
    await page.getByRole('button', { name: '保存修改' }).click();
    await page.getByRole('button', { name: '确认保存' }).click();
    await expect(page.getByText('设置已保存').first()).toBeVisible();

    await page.goto('/#/tasks');
    await expect(page.getByText('当前看板共').first()).toBeVisible();
  });
});

test.describe('全局 Shell 挂件', () => {
  test('命令面板可搜索页面并跳转', async ({ page }) => {
    await login(page);

    await page.keyboard.press('Control+k');
    const search = page.getByPlaceholder('搜索页面或操作，按回车执行');
    await expect(search).toBeVisible();

    await search.fill('角色');
    await page.getByText('跳转到角色管理').click();
    await expect(page).toHaveURL(/#\/roles$/);
  });

  test('消息铃铛可展开并跳转通知中心', async ({ page }) => {
    await login(page);

    await page.locator('[data-tour="notification-bell"]').click();
    const viewAll = page.getByRole('button', { name: '查看全部通知' });
    await expect(viewAll).toBeVisible();

    await viewAll.click();
    await expect(page).toHaveURL(/#\/notifications$/);
  });

  test('在线客服坞可发送消息并收到回复', async ({ page }) => {
    await login(page);

    await page.locator('[data-tour="chat-dock"]').click();
    await expect(page.getByText('在线客服').first()).toBeVisible();

    const input = page.getByPlaceholder('输入消息，回车发送');
    await input.fill('你好');
    await input.press('Enter');

    await expect(page.getByText(/已收到你的消息/).first()).toBeVisible();
  });

  test('首次登录展示新手引导并可关闭', async ({ page }) => {
    await login(page, { withTour: true });

    await expect(page.getByText('欢迎使用管理中心')).toBeVisible();

    await page.getByRole('button', { name: '关闭引导' }).click();
    await expect(page.getByText('欢迎使用管理中心')).toBeHidden();
  });
});
