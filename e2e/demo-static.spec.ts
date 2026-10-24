import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function getTigercatVersion(projectName: string): Promise<string> {
  const framework = projectName.startsWith('react') ? 'react' : 'vue';
  const directory = framework === 'react' ? 'Tigercat.Admin.React' : 'Tigercat.Admin.Vue';
  const packageJson = JSON.parse(await readFile(
    `${directory}/node_modules/@expcat/tigercat-${framework}/package.json`,
    'utf8',
  ));
  return packageJson.version;
}

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
    await expect(page.getByText(/已加载 \d+ \/ \d+ 个匹配任务/)).toBeVisible();
  });
});

test('仪表盘、报表和审计按所选格式下载 API 文件', async ({ page }) => {
  await login(page);
  const downloads: import('@playwright/test').Download[] = [];
  page.on('download', (download) => downloads.push(download));

  for (const [path, field] of [
    ['dashboard', 'value'],
    ['reports', 'value'],
    ['audit-logs', 'eventType'],
  ] as const) {
    await page.goto(`/#/${path}`);
    for (const [format, label] of [
      ['csv', 'CSV'],
      ['json', 'JSON'],
      ['xlsx', 'Excel'],
    ] as const) {
      const button = page.getByRole('button', { name: `导出 ${label}`, exact: true });
      const previousCount = downloads.length;
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        button.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
      const content = await readFile((await download.path())!);
      expect(content.length).toBeGreaterThan(0);
      if (format === 'json') {
        const rows = JSON.parse(content.toString());
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]).toHaveProperty(field);
      }
      await expect(button).toBeEnabled();
      expect(downloads).toHaveLength(previousCount + 1);
    }
  }
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

    const recentItems = viewAll.locator('..').locator('..').locator('ul > li > button');
    await expect(recentItems.first()).toBeVisible();
    await recentItems.first().click();
    const viewAction = page.getByRole('button', { name: '查看', exact: true });
    await expect(viewAction).toHaveCount(1);
    await viewAction.click();
    await expect(page).toHaveURL(/#\/notifications$/);
    await expect(viewAction).toHaveCount(0);

    await page.locator('[data-tour="notification-bell"]').click();
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
    await expect(page.getByText('渠道明细', { exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: '月度转化趋势', exact: true }).locator('polyline')).toBeVisible();

    // Segmented 切换时间范围后仍停留在分析页且内容可见。
    await page.getByText('近 7 天').click();
    await expect(page).toHaveURL(/#\/analytics$/);
    await expect(page.getByText('直接访问').first()).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('个人中心可切换选项卡', async ({ page }) => {
    await login(page);

    await page.goto('/#/profile');
    await expect(page.getByRole('heading', { name: '个人中心', exact: true })).toBeVisible();

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
    await expect(page.getByRole('heading', { name: '个人中心', exact: true })).toBeVisible();
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
    // 默认选中第一条工单，右侧详情应渲染生命周期、工单信息与展示用审批时间线。
    await expect(page.getByText('导出报表时偶发 500 错误').first()).toBeVisible();
    await expect(page.getByText('工单生命周期', { exact: true })).toBeVisible();
    await expect(page.getByText('工单信息', { exact: true })).toBeVisible();
    await expect(page.getByText('审批进度', { exact: true })).toBeVisible();
    await expect(page.getByRole('toolbar', { name: '审批操作' })).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeEnabled();
    const chat = page.locator('#main-content-scroll [data-tiger-chat-window]').first();
    await chat.scrollIntoViewIfNeeded();
    await expect(chat).toBeVisible();
    await expect(page.locator('#main-content-scroll [data-resizable]').first()).toBeVisible();

    // 新建工单抽屉可打开。
    await page.getByRole('button', { name: '新建工单' }).click();
    await expect(page.getByRole('button', { name: '创建工单' })).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('审批中心可展示待办并打开详情', async ({ page }) => {
    await login(page);

    await page.goto('/#/approvals');
    await expect(page.getByText('审批中心').first()).toBeVisible();
    await expect(page.getByText('工单升级：导出报表偶发 500').first()).toBeVisible();
    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: '审批进度' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('审批流程')).toBeHidden();
    await expect(page.getByRole('toolbar', { name: '审批操作' })).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
    await page.getByRole('tab', { name: '流程结构' }).click();
    await expect(page.getByLabel('审批流程')).toBeVisible();
    await expect(page.getByLabel('审批流程').getByText('王经理', { exact: true })).toBeVisible();
    await expect(page.getByLabel('审批流程').getByText('李总监', { exact: true })).toBeVisible();
  });

  test('流程设计页可轻编辑并预览同一份 steps', async ({ page }) => {
    await login(page);

    await page.goto('/#/workflow-designer');
    await expect(page.getByText('流程设计').first()).toBeVisible();
    const designer = page.getByRole('region', { name: '流程设计器' });
    await expect(designer).toBeVisible();
    await expect(designer.getByRole('group', { name: '主管会签' })).toBeVisible();
    await expect(designer.getByText('王经理, 李总监')).toBeVisible();
    await expect(page.getByRole('region', { name: '节点设置' })).toContainText('选中节点后在此编辑');
    await expect(designer.getByRole('button', { name: '在后方插入 (主管会签)' })).toBeVisible();

    await page.getByText('流程预览').click();
    const preview = page.getByLabel('审批流程');
    await expect(preview.getByText('王经理', { exact: true })).toBeVisible();
    await expect(preview.getByText('李总监', { exact: true })).toBeVisible();

    await designer.getByRole('group', { name: '主管会签' }).getByText('王经理, 李总监').click();
    await expect(page.getByRole('region', { name: '节点设置' }).getByLabel('标题')).toHaveValue(
      '主管会签',
    );
    await expect(page.getByLabel('审批人 1')).toHaveValue('王经理');
    await expect(page.getByLabel('审批人 2')).toHaveValue('李总监');

    await expect(page.getByText('当前 7 个节点')).toBeVisible();
    await expect(page.getByRole('button', { name: '恢复默认' })).toBeVisible();
    await expect(page.locator('#main-content-scroll').getByRole('button', { name: '发布（本机演示）', exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: '添加步骤' }).click();
    await expect(page.getByText('当前 8 个节点')).toBeVisible();

    await page.getByRole('button', { name: '恢复默认' }).click();
    await expect(page.getByText('当前 7 个节点')).toBeVisible();
    await designer.getByRole('button', { name: '在后方插入 (主管会签)' }).click();
    await designer.getByRole('menu', { name: '插入节点', exact: true })
      .getByRole('menuitem', { name: '审批', exact: true }).click();
    await expect(page.getByText('当前 8 个节点')).toBeVisible();
  });

  test('团队日历可展示日程并打开新建事件', async ({ page }) => {
    await login(page);
    await page.evaluate(async () => {
      const session = JSON.parse(localStorage.getItem('tigercat.admin.session') || 'null');
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, start: '10:00', end: '11:00', title: 'UP05 今日演示日程', type: 'meeting' }),
      });
      if (!response.ok) throw new Error('Calendar fixture creation failed');
    });

    await page.goto('/#/calendar');
    await expect(page.getByText('团队日历').first()).toBeVisible();
    // 默认打开当天，展示刚写入的共享日程。
    await expect(page.getByText('UP05 今日演示日程').first()).toBeVisible();
    // 精确匹配分区标题，避免与无日程时倒计时标题「暂无即将到来的日程」产生包含歧义。
    await expect(page.getByText('即将到来', { exact: true })).toBeVisible();

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
    // 配置和接口示例字段可见，不表示真实执行。
    await expect(page.getByText('每日对账批处理').first()).toBeVisible();
    await expect(page.getByText('执行时间轴（示例）', { exact: true })).toBeVisible();
    await expect(page.getByText('运行阶段（示例）', { exact: true })).toBeVisible();

    // 新建任务抽屉可打开。
    await page.getByRole('button', { name: '新建任务' }).click();
    await expect(page.getByRole('button', { name: '创建任务' })).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('数据导入向导可分步并完成导入', async ({ page }) => {
    await login(page);

    await page.goto('/#/import');
    await expect(page.getByText('数据导入').first()).toBeVisible();
    const next = page.getByRole('button', { name: '下一步', exact: true });
    await expect(next).toBeDisabled();
    await page.getByLabel('选择 UTF-8 CSV 文件').setInputFiles({
      name: 'users.csv', mimeType: 'text/csv',
      buffer: Buffer.from(`username,password\nup12_demo_${Date.now()},ImportSecret42!\n`),
    });

    // 读取实际 CSV 后确认映射并校验，再提交用户导入。
    await next.click();
    await page.getByRole('button', { name: '校验并预览', exact: true }).click();
    await expect(page.getByText('校验通过 1，跳过 0，失败 0', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '开始导入' }).click();

    await expect(page).toHaveURL(/#\/import\/IMP-/);
    await expect(page.getByText('导入完成 · 已处理 1/1 行', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '返回数据导入' })).toBeVisible();
  });
});

test.describe('阶段 5 — 帮助与报表', () => {
  test('帮助中心加载并可展开常见问题', async ({ page }, testInfo) => {
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

    const articles = page.getByRole('list', { name: '帮助文章', exact: true }).locator('li');
    const more = page.getByRole('button', { name: '加载更多文章', exact: true });
    await expect(articles).toHaveCount(5);
    await more.click();
    await expect(articles).toHaveCount(10);
    await more.click();
    await expect(articles).toHaveCount(15);
    await expect(more).toHaveCount(0);
    const search = page.getByRole('textbox', { name: '搜索帮助文章' });
    await search.fill('CSV');
    await expect(articles).toHaveCount(2);
    await expect(page.getByRole('link', { name: '打开：CSV 用户导入与结果恢复' })).toBeVisible();
    await search.fill('没有这样的帮助文章');
    await expect(page.getByText('没有匹配的帮助文章', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '清空搜索' }).click();
    await expect(articles).toHaveCount(5);
    await search.fill('媒体详情');
    await page.getByRole('link', { name: '打开：文件上传与媒体详情' }).press('Enter');
    await expect(page).toHaveURL(/#\/files$/);
    await page.goto('/#/about');
    await expect(page.locator('#about-info').getByText('static-demo', { exact: true })).toBeVisible();
    await expect(page.getByText(`Tigercat UI ${await getTigercatVersion(testInfo.project.name)}`, { exact: true })).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });

  test('关于页服务失败关闭提示后仍失败，重试按真实响应恢复', async ({ page }, testInfo) => {
    await login(page);
    await page.evaluate(() => {
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        if (String(input) !== '/api/info') return originalFetch(input, init);
        return !(window as Window & { up10InfoReady?: boolean }).up10InfoReady
          ? new Response(JSON.stringify({ success: false, message: '服务暂不可用' }), { status: 503 })
          : new Response(JSON.stringify({ success: true, data: { name: '测试服务', version: 'api-test-1.7', description: '重连成功' } }));
      };
      window.location.hash = '#/about';
    });
    const overview = page.locator('#about-info');
    await expect(page.getByText('服务暂不可用', { exact: true })).toBeVisible();
    await expect(overview.getByText('连接失败', { exact: true })).toBeVisible();
    await page.getByRole('alert').getByRole('button').click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(overview.getByText('连接失败', { exact: true })).toBeVisible();
    await expect(overview.getByText('已连接', { exact: true })).toHaveCount(0);
    await page.evaluate(() => { (window as Window & { up10InfoReady?: boolean }).up10InfoReady = true; });
    await overview.getByRole('button', { name: '重新连接服务', exact: true }).press('Enter');
    await expect(overview.getByText('已连接', { exact: true })).toBeVisible();
    await expect(overview.getByText('api-test-1.7', { exact: true })).toBeVisible();
    await expect(overview.getByText(await getTigercatVersion(testInfo.project.name), { exact: true })).toHaveCount(0);
  });

  test('报表预览与导出使用相同系统统计及 UTC 天数', async ({ page }) => {
    await login(page);
    await page.goto('/#/reports');
    await expect(page.getByRole('button', { name: '打印', exact: true })).toBeEnabled();
    await expect(page.locator('[data-section="trend"]')).toHaveCount(7);

    for (const days of [1, 30, 90]) {
      await page.getByText(`近 ${days} 天`, { exact: true }).click();
      await expect(page.locator('[data-section="trend"]')).toHaveCount(days);
      const previewRows = await page.getByTestId('report-data').locator('tbody tr').evaluateAll((rows) =>
        rows.map((row) => {
          const [section, key, label, value] = Array.from(row.querySelectorAll('td'), (cell) => cell.textContent?.trim());
          return { section, key, label, value };
        }),
      );
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: '导出 JSON', exact: true }).click(),
      ]);
      const exportedRows = JSON.parse(await readFile((await download.path())!, 'utf8'));
      expect(exportedRows).toEqual(previewRows);
      const trend = exportedRows.filter((row: { section: string }) => row.section === 'trend');
      const today = new Date().toISOString().slice(0, 10);
      expect(trend.at(-1).key).toBe(today);
      expect(trend[0].key).toBe(new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10));
      await expect(page.getByTestId('report-period')).toHaveText(`${trend[0].key} ~ ${today}`);
    }
  });
});

test.describe('阶段 9 — 实时监控', () => {
  test('实时监控页加载并可暂停或切换刷新间隔', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/monitor');
    await expect(page.getByText('实时监控').first()).toBeVisible();
    await expect(page.getByText('CPU 水位').first()).toBeVisible();
    await expect(page.getByText('内存 水位').first()).toBeVisible();
    await expect(page.getByText('磁盘 水位').first()).toBeVisible();
    await expect(page.getByText('QPS', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('实时事件').first()).toBeVisible();
    await expect(page.getByText('刷新中').first()).toBeVisible();

    await page.getByText('2 秒', { exact: true }).click();
    await expect(page).toHaveURL(/#\/monitor$/);
    await expect(page.getByText('CPU 水位').first()).toBeVisible();

    await page.getByRole('button', { name: '暂停' }).click();
    await expect(page.getByRole('button', { name: '继续' })).toBeVisible();
    await expect(page.getByText('已暂停').first()).toBeVisible();

    await page.getByRole('button', { name: '继续' }).click();
    await expect(page.getByRole('button', { name: '暂停' })).toBeVisible();
    await expect(page.getByText('刷新中').first()).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });
});

test.describe('阶段 9 — 项目列表与详情', () => {
  test('项目列表可进入详情，未知 id 显示空态并保持列表菜单高亮', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/projects');
    await expect(page.getByText('项目列表').first()).toBeVisible();
    await expect(page.getByText('智能运营台').first()).toBeVisible();
    await expect(page.getByTestId('project-card-1001')).toBeVisible();

    await page.getByTestId('project-card-1001').click();
    await expect(page).toHaveURL(/#\/projects\/1001$/);
    await expect(page.getByText('智能运营台').first()).toBeVisible();
    await expect(page.getByText('项目概要').first()).toBeVisible();
    await expect(page.getByTestId('shell-tag-projects')).toHaveAttribute(
      'data-active',
      'true',
    );

    await page.getByRole('tab', { name: '成员' }).click();
    await expect(page.getByText('王小虎').first()).toBeVisible();
    await page.getByRole('tab', { name: '动态' }).click();
    await expect(page.getByText('项目动态').first()).toBeVisible();

    await page.getByRole('button', { name: '返回项目列表' }).click();
    await expect(page).toHaveURL(/#\/projects$/);

    await page.goto('/#/projects/missing');
    await expect(page.getByText('未找到项目').first()).toBeVisible();
    await expect(page.getByTestId('shell-tag-projects')).toHaveAttribute(
      'data-active',
      'true',
    );

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });
});

test.describe('阶段 10 — 大数据演示', () => {
  test('大数据演示页加载并切换四个分区', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    await page.goto('/#/performance');
    await expect(page.getByText('大数据演示').first()).toBeVisible();
    await expect(page.getByText('日志行数').first()).toBeVisible();
    await expect(page.getByTestId('performance-virtual-list')).toBeVisible();
    await expect(page.getByText('同步缓存分片完成 #1').first()).toBeVisible();

    await page.getByRole('tab', { name: '万行多列' }).click();
    await expect(page.getByTestId('performance-virtual-table')).toBeVisible();
    await expect(page.getByText('编号').first()).toBeVisible();
    await expect(page.getByText('EVT-00001').first()).toBeVisible();

    await page.getByRole('tab', { name: '自由拖拽' }).click();
    await expect(page.getByTestId('performance-drag-list')).toBeVisible();
    await expect(page.getByText('日志检索超时排查').first()).toBeVisible();
    await expect(page.getByText('当前顺序').first()).toBeVisible();
    const queue = page.getByTestId('performance-drag-list');
    const sourceCard = queue.locator('[data-drag-id="queue-1"]');
    const targetCard = queue.locator('[data-drag-id="queue-2"]');
    await targetCard.scrollIntoViewIfNeeded();
    await expect(sourceCard).toBeInViewport({ ratio: 1 });
    await expect(targetCard).toBeInViewport({ ratio: 1 });
    await sourceCard.dragTo(targetCard);
    await expect(queue.getByText('日志检索超时排查：第 1 位 → 第 2 位', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: '低层看板' }).click();
    await expect(page.getByTestId('performance-kanban')).toBeVisible();
    await expect(page.getByText('接入').first()).toBeVisible();
    await expect(page.getByText('低层看板组件').first()).toBeVisible();

    expect(consoleErrors.filter((item) => item.includes('/api/'))).toEqual([]);
  });
});
