import { expect, test } from './fixtures/auth';

const DEMO_ACTOR_KEY = 'tigercat-admin:approval-actor';

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

  test('采购财务节点金额仅财务身份可编', async ({ page }) => {
    await page.goto('/approvals/AP-1007');
    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    const amount = page.getByLabel('金额 / 天数');
    await expect(amount).toBeVisible();
    await expect(amount).toBeDisabled();

    await page.getByLabel('演示身份').click();
    await page.getByRole('option', { name: /陈财务/ }).click();
    await expect(page.getByText('财务会签').first()).toBeVisible();
    await expect(page.getByLabel('金额 / 天数')).toBeEnabled();
    await expect(page.getByRole('button', { name: '同意' })).toBeVisible();
  });
});
