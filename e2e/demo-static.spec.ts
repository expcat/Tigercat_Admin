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

test.describe('阶段 1 — 个人中心与数据分析', () => {
  test('数据分析看板加载图表并可切换时间范围', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/analytics');
    await expect(page.getByText('数据分析').first()).toBeVisible();
    // Skeleton 结束后，图表与明细渲染成功（任一卡片崩溃都会导致整页空白）。
    await expect(page.getByText('直接访问').first()).toBeVisible();
    await expect(page.getByText('渠道明细')).toBeVisible();

    // Segmented 切换时间范围后仍停留在分析页且内容可见。
    await page.getByText('近 7 天').click();
    await expect(page).toHaveURL(/#\/analytics$/);
    await expect(page.getByText('直接访问').first()).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('个人中心可切换选项卡', async ({ page }) => {
    await login(page);

    await page.goto('/#/profile');
    await expect(page.getByText('个人中心').first()).toBeVisible();

    await page.getByText('安全设置', { exact: true }).click();
    await expect(page.getByText('两步验证').first()).toBeVisible();

    await page.getByText('偏好', { exact: true }).click();
    await expect(page.getByText('主题色').first()).toBeVisible();

    await page.getByText('登录设备', { exact: true }).click();
    await expect(page.getByText('当前登录设备').first()).toBeVisible();
  });

  test('头像下拉可进入个人中心', async ({ page }) => {
    await login(page);

    await page.locator('.p2-header-user-btn').click();
    await page.getByText('个人中心').click();

    await expect(page).toHaveURL(/#\/profile$/);
    await expect(page.getByText('个人中心').first()).toBeVisible();
  });
});

test.describe('阶段 2 — 协作沟通', () => {
  test('工单中心可展示主从详情并打开新建抽屉', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/tickets');
    await expect(page.getByText('工单中心').first()).toBeVisible();
    // 默认选中第一条工单，右侧详情应渲染生命周期与工单信息。
    await expect(page.getByText('导出报表时偶发 500 错误').first()).toBeVisible();
    await expect(page.getByText('工单生命周期', { exact: true })).toBeVisible();
    await expect(page.getByText('工单信息', { exact: true })).toBeVisible();

    // 新建工单抽屉可打开。
    await page.getByRole('button', { name: '新建工单' }).click();
    await expect(page.getByRole('button', { name: '创建工单' })).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('团队日历可展示日程并打开新建事件', async ({ page }) => {
    await login(page);

    await page.goto('/#/calendar');
    await expect(page.getByText('团队日历').first()).toBeVisible();
    // 默认日期 2026-06-29 含两条日程。
    await expect(page.getByText('迭代站会').first()).toBeVisible();
    await expect(page.getByText('即将到来')).toBeVisible();

    // 新建事件抽屉可打开。
    await page.getByRole('button', { name: '新建事件' }).click();
    await expect(page.getByRole('button', { name: '创建事件' })).toBeVisible();
  });
});

test.describe('阶段 3 — 内容管理与图库', () => {
  test('内容编辑可切换编辑器并发布', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/content');
    await expect(page.getByText('内容编辑').first()).toBeVisible();
    await expect(page.getByText('正文', { exact: true })).toBeVisible();

    // Segmented 切换到 Markdown 编辑器后仍停留在内容页。
    await page.getByText('Markdown', { exact: true }).click();
    await expect(page).toHaveURL(/#\/content$/);
    await expect(page.getByText('正文', { exact: true })).toBeVisible();

    // 发布后展示成功结果。
    await page.getByRole('button', { name: '发布', exact: true }).click();
    await expect(page.getByText('发布成功').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '继续编辑' })).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('媒体图库可浏览图片并展示空相册', async ({ page }) => {
    await login(page);

    await page.goto('/#/gallery');
    await expect(page.getByText('媒体图库').first()).toBeVisible();
    await expect(page.getByText('精选轮播')).toBeVisible();
    // 默认“全部”相册含示例图片。
    await expect(page.getByText('产品概览').first()).toBeVisible();

    // 切换到空相册展示 Empty 状态。
    await page.getByText('空相册', { exact: true }).click();
    await expect(page.getByText(/该相册暂无图片/).first()).toBeVisible();
  });
});

test.describe('阶段 4 — 运维自动化', () => {
  test('定时任务看板加载并可打开新建抽屉', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/jobs');
    await expect(page.getByText('定时任务').first()).toBeVisible();
    // 任务表格默认渲染示例任务，执行时间轴与运行阶段卡片可见。
    await expect(page.getByText('每日对账批处理').first()).toBeVisible();
    await expect(page.getByText('执行时间轴', { exact: true })).toBeVisible();
    await expect(page.getByText('运行阶段', { exact: true })).toBeVisible();

    // 新建任务抽屉可打开。
    await page.getByRole('button', { name: '新建任务' }).click();
    await expect(page.getByRole('button', { name: '创建任务' })).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('数据导入向导可分步并完成导入', async ({ page }) => {
    await login(page);

    await page.goto('/#/import');
    await expect(page.getByText('数据导入').first()).toBeVisible();
    await expect(page.getByText('导入模式', { exact: true })).toBeVisible();

    // 逐步推进向导到最后一步并执行导入。
    const next = page.getByRole('button', { name: '下一步' });
    await next.click();
    await next.click();
    await next.click();
    await page.getByRole('button', { name: '开始导入' }).click();

    // 导入完成后展示结果页。
    await expect(page.getByText('导入完成').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '再次导入' })).toBeVisible();
  });
});

test.describe('阶段 5 — 帮助与报表', () => {
  test('帮助中心加载并可展开常见问题', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/help');
    await expect(page.getByText('帮助中心').first()).toBeVisible();
    // 长文档各章节与快捷键代码块渲染。
    await expect(page.getByText('快速开始').first()).toBeVisible();
    await expect(page.getByText('常见问题').first()).toBeVisible();
    await expect(page.getByText('curl -X GET').first()).toBeVisible();

    // FAQ 手风琴：点击另一问题后其答案可见。
    await page.getByText('为什么某些菜单看不到？').click();
    await expect(page.getByText('左侧菜单会根据角色权限码过滤').first()).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('报表打印加载并可切换报表类型', async ({ page }) => {
    await login(page);

    await page.goto('/#/reports');
    await expect(page.getByText('报表打印').first()).toBeVisible();
    // 打印布局内的报表区块与明细渲染。
    await expect(page.getByText('关键指标', { exact: true })).toBeVisible();
    await expect(page.getByText('渠道明细', { exact: true })).toBeVisible();
    await expect(page.getByText('自然搜索', { exact: true })).toBeVisible();
    await expect(page.getByText('报表生成完成').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '打印' })).toBeVisible();

    // 切换到销售周报，统计区间随之更新。
    await page.getByText('销售周报').first().click();
    await expect(page.getByText('2026-06-25 ~ 2026-07-01').first()).toBeVisible();
  });
});
