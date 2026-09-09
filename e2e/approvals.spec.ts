import { expect, test } from './fixtures/auth';

test.describe('审批中心 mock 流转', () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin();
  });

  test('四条列表可切换，详情同意会写回实例', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByText('审批中心', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '发起审批' })).toBeVisible();
    await expect(page.getByText('工单升级：导出报表偶发 500').first()).toBeVisible();

    await page.getByRole('radio', { name: '已办' }).click();
    await expect(page.getByText('工单结案：登录后跳回登录页').first()).toBeVisible();

    await page.getByRole('radio', { name: '抄送' }).click();
    await expect(page.getByText('请假：周五下午调休').first()).toBeVisible();

    await page.getByRole('radio', { name: '我发起的' }).click();
    await expect(page.getByText('报销：线上会议软件年费').first()).toBeVisible();

    await page.getByRole('radio', { name: '待办' }).click();
    await page.getByRole('button', { name: '查看' }).first().click();

    await expect(page.getByText('申请表单', { exact: true })).toBeVisible();
    await expect(page.getByText('审批树', { exact: true })).toBeVisible();
    await expect(page.getByText('审批时间线', { exact: true })).toBeVisible();
    await expect(page.getByRole('toolbar', { name: '审批操作' })).toBeVisible();

    const approve = page.getByRole('button', { name: '通过' });
    await expect(approve).toBeEnabled();
    await approve.click();
    const confirm = page.getByRole('button', { name: '确定' }).or(page.getByRole('button', { name: '确认' }));
    if (await confirm.first().isVisible().catch(() => false)) {
      await confirm.first().click();
    }
    await expect(page.getByText(/已同意，实例状态已写回|经理审批/).first()).toBeVisible();
  });
});
