import { expect, test, SESSION_KEY, uniqueSuffix } from './fixtures/auth';

const DEMO_ACTOR_KEY = 'tigercat-admin:approval-actor';

async function createCountersignInstance(page: import('@playwright/test').Page, title: string) {
  const id = await page.evaluate(
    async ({ title, sessionKey }) => {
      const session = JSON.parse(localStorage.getItem(sessionKey) || '{}') as { token?: string };
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token ?? ''}`,
        },
        body: JSON.stringify({
          title,
          category: '采购',
          reason: '会签 e2e',
          template: 'countersign',
          useTasks: true,
        }),
      });
      const payload = (await response.json()) as { data?: { id?: string } };
      return payload.data?.id ?? '';
    },
    { title, sessionKey: SESSION_KEY },
  );
  expect(id).toBeTruthy();
  return id;
}

test.describe('审批中心 mock 流转', () => {
  test.beforeEach(async ({ loginAsAdmin, page }) => {
    await page.addInitScript((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }, DEMO_ACTOR_KEY);
    await loginAsAdmin();
  });

  test('四条列表可切换，详情默认进度 Tab，结构 Tab 见会签人', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByText('审批中心', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '发起审批' })).toBeVisible();
    await expect(page.getByLabel('演示身份')).toBeVisible();
    await expect(page.getByText('工单升级：导出报表偶发 500').first()).toBeVisible();

    await page.getByRole('radio', { name: '已办' }).click();
    await expect(page.getByText('工单结案：登录后跳回登录页').first()).toBeVisible();

    await page.getByRole('radio', { name: '抄送' }).click();
    await expect(page.getByText('请假：周五下午调休').first()).toBeVisible();

    await page.getByRole('radio', { name: '我发起的' }).click();
    await expect(page.getByText('报销：线上会议软件年费').first()).toBeVisible();

    await page.goto('/approvals/AP-1001');
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    await expect(page.locator('[data-tiger-workflow-detail-shell]')).toBeVisible();
    await expect(page.getByRole('tab', { name: '审批进度' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: '流程结构' })).toBeVisible();
    await expect(page.getByLabel('审批流程')).toBeHidden();
    await expect(page.getByRole('group', { name: '路径图例' })).toBeHidden();
    await expect(page.getByRole('toolbar', { name: '审批操作' })).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
    await expect(page.getByRole('button', { name: '拒绝' })).toBeVisible();
    await expect(page.getByRole('button', { name: '撤回' })).toBeVisible();
    await expect(page.getByRole('button', { name: '评论' })).toBeVisible();
    await expect(page.getByRole('button', { name: '更多' })).toBeVisible();
    await expect(page.getByRole('button', { name: '转交' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '加签' })).toHaveCount(0);

    await page.getByRole('button', { name: '更多' }).click();
    await expect(page.getByRole('menuitem', { name: '转交' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '加签' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '退回', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '退回修改' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: '流程结构' }).click();
    await expect(page.getByLabel('审批流程')).toBeVisible();
    await expect(page.getByRole('group', { name: '路径图例' })).toBeVisible();
    await expect(page.getByLabel('审批流程').getByText('王经理', { exact: true })).toBeVisible();
    await expect(page.getByLabel('审批流程').getByText('李总监', { exact: true })).toBeVisible();
  });

  test('发起审批弹层使用 SchemaForm，同意会写回实例', async ({ page }) => {
    await page.goto('/approvals');
    await page.getByRole('button', { name: '发起审批' }).click();
    const form = page.locator('[data-tiger-schema-form]');
    await expect(form).toBeVisible();
    await form.getByPlaceholder('例如：请假、报销或工单升级').fill('SchemaForm 演示审批');
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    await expect(page.getByText('SchemaForm 演示审批').first()).toBeVisible();
    await expect(page.locator('[data-tiger-workflow-detail-shell]')).toBeVisible();

    await page.getByRole('button', { name: '同意' }).click();
    await expect(page.getByText('确认同意？')).toBeVisible();
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.getByText('已同意，实例状态已写回').first()).toBeVisible();
  });

  test('拒绝可带意见并写回步骤评论', async ({ page }) => {
    await page.goto('/approvals');
    await page.getByRole('button', { name: '发起审批' }).click();
    const form = page.locator('[data-tiger-schema-form]');
    await expect(form).toBeVisible();
    await form.getByPlaceholder('例如：请假、报销或工单升级').fill('拒绝意见写回');
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '拒绝' }).click();
    await expect(page.getByText('确认拒绝该申请？')).toBeVisible();
    const comment = page.getByLabel('请输入审批意见');
    await expect(comment).toBeVisible();
    await comment.fill('资料不全，先驳回');
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.getByText('已驳回，实例状态已写回').first()).toBeVisible();
    await page.getByRole('tab', { name: '审批进度' }).click();
    await expect(page.getByText('资料不全，先驳回').first()).toBeVisible();
  });

  test('加签走更多菜单并写回临时节点', async ({ page }) => {
    await page.goto('/approvals');
    await page.getByRole('button', { name: '发起审批' }).click();
    const form = page.locator('[data-tiger-schema-form]');
    await expect(form).toBeVisible();
    await form.getByPlaceholder('例如：请假、报销或工单升级').fill('加签写回演示');
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '更多' }).click();
    await page.getByRole('menuitem', { name: '加签' }).click();
    await expect(page.getByText('确认加签？')).toBeVisible();
    await page.getByText('王经理（wang）').click();
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.getByText('已加签，实例状态已写回').first()).toBeVisible();
    await page.getByRole('tab', { name: '审批进度' }).click();
    await expect(page.getByText('王经理').first()).toBeVisible();
  });

  test('采购财务节点金额仅财务身份可编，关联工单隐藏', async ({ page }) => {
    await page.goto('/approvals/AP-1007');
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    const amount = page.getByLabel('金额 / 天数');
    await expect(amount).toBeVisible();
    await expect(amount).toBeDisabled();
    await expect(page.getByLabel('关联工单')).toHaveCount(0);

    await page.getByLabel('演示身份').click();
    await page.getByRole('option', { name: /陈财务/ }).click();
    await expect(page.getByText('财务会签').first()).toBeVisible();
    await expect(page.getByLabel('金额 / 天数')).toBeEnabled();
    await expect(page.getByLabel('关联工单')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
  });

  test('会签按人累计，第二人同意后进度 2/3', async ({ page }) => {
    const title = `会签 e2e ${uniqueSuffix()}`;
    const id = await createCountersignInstance(page, title);
    await page.goto(`/approvals/${id}`);
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
    await page.getByRole('button', { name: '同意' }).click();
    await expect(page.getByText('确认同意？')).toBeVisible();
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.getByText('已同意，实例状态已写回').first()).toBeVisible();
    await page.getByRole('tab', { name: '审批进度' }).click();
    await page.getByText('会签审批').first().scrollIntoViewIfNeeded();
    await expect(page.getByText(/1\/3/).first()).toBeVisible();

    await page.getByLabel('演示身份').click();
    await page.getByRole('option', { name: /演示用户/ }).click();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
    await page.getByRole('button', { name: '同意' }).click();
    await expect(page.getByText('确认同意？')).toBeVisible();
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.getByText('已同意，实例状态已写回').first()).toBeVisible();
    await page.getByRole('tab', { name: '审批进度' }).click();
    await page.getByText('会签审批').first().scrollIntoViewIfNeeded();
    await expect(page.getByText(/2\/3/).first()).toBeVisible();
  });

  test('退回选节点写回活实例', async ({ page }) => {
    await page.goto('/approvals');
    await page.getByRole('button', { name: '发起审批' }).click();
    const form = page.locator('[data-tiger-schema-form]');
    await expect(form).toBeVisible();
    const title = `退回 e2e ${uniqueSuffix()}`;
    await form.getByPlaceholder('例如：请假、报销或工单升级').fill(title);
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();

    await page.getByRole('button', { name: '更多' }).click();
    await page.getByRole('menuitem', { name: '退回', exact: true }).click();
    await expect(page.getByText('确认退回？')).toBeVisible();
    await expect(page.getByText('退回至')).toBeVisible();
    await expect(page.getByText('提交申请  管理员')).toBeVisible();
    await page.getByRole('textbox', { name: '请输入审批意见' }).fill('请发起人核对规格后再送审');
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.getByText('已退回，实例状态已写回').first()).toBeVisible();
    await expect(page.getByText('当前步骤 提交申请').first()).toBeVisible();
  });

  test('流程设计 Inspector 四 Tab 与发布校验', async ({ page }) => {
    await page.goto('/workflow-designer');
    await expect(page.getByText('流程设计').first()).toBeVisible();
    const designer = page.getByRole('region', { name: '流程设计器' });
    await expect(designer).toBeVisible();
    await expect(designer.getByRole('group', { name: '主管会签' })).toBeVisible();
    await expect(designer.getByRole('group', { name: '财务会签' })).toBeVisible();
    await expect(designer.getByRole('group', { name: '抄送人事' })).toBeVisible();
    await expect(designer.getByRole('group', { name: '金额大于 1000' })).toBeVisible();
    await expect(page.getByText('当前 7 个节点')).toBeVisible();
    await expect(page.getByText('存在阻塞项，无法发布')).toHaveCount(0);

    await designer.getByRole('group', { name: '主管会签' }).getByText('李四, 钱七').click();
    const inspector = page.getByRole('region', { name: '节点设置' });
    await expect(inspector).toBeVisible();
    await expect(inspector.getByLabel('标题')).toHaveValue('主管会签');
    await expect(inspector.getByRole('tab', { name: '审批人' })).toHaveAttribute('aria-selected', 'true');
    await expect(inspector.getByRole('tab', { name: '操作按钮' })).toBeVisible();
    await expect(inspector.getByRole('tab', { name: '表单权限' })).toBeVisible();
    await expect(inspector.getByRole('tab', { name: '高级' })).toBeVisible();
    await expect(inspector.getByLabel('审批人 1')).toHaveValue('李四');
    await expect(inspector.getByLabel('审批人 2')).toHaveValue('钱七');

    await inspector.getByRole('tab', { name: '操作按钮' }).click();
    await expect(inspector.getByRole('tab', { name: '操作按钮' })).toHaveAttribute('aria-selected', 'true');
    await expect(inspector.getByText('同意', { exact: true })).toBeVisible();
    await expect(inspector.getByText('加签', { exact: true })).toBeVisible();

    await inspector.getByRole('tab', { name: '表单权限' }).click();
    await expect(inspector.getByText('金额 / 天数')).toBeVisible();
    await expect(inspector.getByText('隐藏', { exact: true })).toBeVisible();

    await inspector.getByRole('tab', { name: '高级' }).click();
    await expect(inspector.getByLabel('自动通过/拒绝')).toBeVisible();

    await page.getByRole('button', { name: '发布' }).click();
    await expect(page.getByText('已发布（演示，不写回引擎）').first()).toBeVisible();

    await page.getByRole('button', { name: '添加步骤' }).click();
    await expect(page.getByText('当前 8 个节点')).toBeVisible();
    await expect(page.getByText('存在阻塞项，无法发布').first()).toBeVisible();
    await expect(page.getByText('该审批节点没有审批人').first()).toBeVisible();
    await page.getByRole('button', { name: '发布' }).click();
    await expect(page.getByText('存在阻塞项，无法发布').first()).toBeVisible();

    await page.getByRole('button', { name: '恢复默认' }).click();
    await expect(page.getByText('当前 7 个节点')).toBeVisible();
    await expect(page.getByText('存在阻塞项，无法发布')).toHaveCount(0);
  });

  test('审批操作条没有无名 0×0 确认 trigger', async ({ page }) => {
    await page.goto('/approvals/AP-1001');
    const actionBar = page.getByRole('toolbar', { name: '审批操作' });
    await expect(actionBar).toBeVisible();
    const nameless = await actionBar.locator('button').evaluateAll((buttons) =>
      buttons.filter((button) => {
        const rect = button.getBoundingClientRect();
        const name = (button.textContent || button.getAttribute('aria-label') || '').trim();
        return !name && (button as HTMLButtonElement).disabled && rect.width < 1 && rect.height < 1;
      }).length,
    );
    expect(nameless).toBe(0);
  });

  test('工单空搜展示 Empty 并可清除筛选，详情可打开关联审批', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByText('工单中心').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '打开审批 AP-1001' })).toBeVisible();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
    await expect(page.getByRole('button', { name: '拒绝' })).toBeVisible();
    await expect(page.getByRole('button', { name: '撤回' })).toBeVisible();

    await page.getByPlaceholder('搜索标题 / 提交人 / 工单号').fill('zzz-no-match');
    await expect(page.getByText('没有符合条件的工单，试试调整筛选或搜索关键词。')).toBeVisible();
    await expect(page.getByRole('button', { name: '清除筛选' })).toBeVisible();
    await page.getByRole('button', { name: '清除筛选' }).click();
    await expect(page.getByText('导出报表时偶发 500 错误').first()).toBeVisible();

    await page.getByRole('button', { name: '打开审批 AP-1001' }).click();
    await expect(page).toHaveURL(/\/approvals\/AP-1001$/);
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
  });
});
