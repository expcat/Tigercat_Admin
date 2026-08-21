import { expect, test } from '@playwright/test';

async function suppressTour(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('tigercat-admin:onboarding-tour:done', '1');
    } catch {
      /* ignore storage errors */
    }
  });
}

async function inputOtpCode(page: import('@playwright/test').Page, code: string) {
  for (const digit of code.split('')) {
    await page.locator(`[data-key="${digit}"]`).click();
  }
}

test.describe('登录流程增强（忘记密码 / 两步验证 / 注册成功）', () => {
  test('demo 账号登录进入两步验证，验证码通过后写入会话', async ({ page }) => {
    await suppressTour(page);
    await page.goto('/#/login');

    await page.getByPlaceholder('请输入用户名').fill('demo');
    await page.getByPlaceholder('请输入密码').fill('demo');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByRole('heading', { name: '两步验证' })).toBeVisible();
    await expect(page.getByText('演示验证码：123456')).toBeVisible();

    // 长度不足时「验证」禁用，双端一致阻断提交。
    await inputOtpCode(page, '12345');
    await expect(page.getByRole('button', { name: '验证', exact: true })).toBeDisabled();

    await inputOtpCode(page, '6');
    await expect(page.getByRole('button', { name: '验证', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: '验证', exact: true }).click();

    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('tigercat.admin.session')),
      )
      .toContain('demo');
  });

  test('忘记密码三步流程完成重置并返回登录', async ({ page }) => {
    await suppressTour(page);
    await page.goto('/#/login');

    await page.getByRole('button', { name: '忘记密码？' }).click();
    await expect(page.getByPlaceholder('请输入邮箱或手机号')).toBeVisible();

    await page.getByPlaceholder('请输入邮箱或手机号').fill('demo@tigercat.local');
    await page.getByRole('button', { name: '获取验证码' }).click();
    await page.getByPlaceholder('请输入验证码').fill('123456');
    await page.getByRole('button', { name: '下一步' }).click();

    await page.getByPlaceholder('请输入新密码').fill('demo-new-123');
    await page.getByPlaceholder('请再次输入新密码').fill('demo-new-123');
    await page.getByRole('button', { name: '重置密码' }).click();

    await expect(page.getByText('密码已重置')).toBeVisible();
    await page.getByRole('button', { name: '返回登录' }).click();
    await expect(page).toHaveURL(/#\/login$/);
  });

  test('注册成功后跳转结果页并可立即回登录', async ({ page }) => {
    await suppressTour(page);
    await page.goto('/#/register');

    await page.getByPlaceholder('请输入用户名').fill('demo-register');
    await page.getByPlaceholder('请输入密码').fill('demo-123456');
    await page.getByRole('button', { name: '注册', exact: true }).click();

    await expect(page.getByText('注册成功')).toBeVisible();
    await page.getByRole('button', { name: '立即登录' }).click();
    await expect(page).toHaveURL(/#\/login$/);
  });
});
