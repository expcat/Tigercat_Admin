import { expect, test } from './fixtures/auth';
import type { Locator, Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

const protectedPages = [
  { path: '/dashboard', text: '欢迎回来' },
  { path: '/users', text: '用户管理' },
  { path: '/roles', text: '角色管理' },
  { path: '/files', text: '文件管理' },
  { path: '/tasks', text: '任务面板' },
  { path: '/notifications', text: '通知中心' },
  { path: '/audit-logs', text: '审计日志' },
  { path: '/settings', text: '系统设置' },
] as const;

async function expectNoPageHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
        return scrollWidth - window.innerWidth;
      }),
    )
    .toBeLessThanOrEqual(1);
}

async function expectInViewport(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const isInViewport = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight
    );
  });
  expect(isInViewport).toBe(true);
}

test.describe('P2 显示与交互门禁', () => {
  test('认证页在移动端和暗色模式下不溢出', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/login');
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    await page.goto('/register');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.getByRole('heading', { name: '创建账号' })).toBeVisible();
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test('核心页面桌面视口无页面级横向溢出', async ({
    page,
    loginAsAdmin,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginAsAdmin();

    for (const item of protectedPages) {
      await page.goto(item.path);
      await expect(page.getByText(item.text).first()).toBeVisible();
      await expectNoPageHorizontalOverflow(page);
    }
  });

  test('核心页面移动视口无页面级横向溢出且 sidebar 可关闭', async ({
    page,
    loginAsAdmin,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsAdmin();

    const toggle = page.getByRole('button', { name: '打开导航菜单' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    const overlayClose = page.getByRole('button', { name: '关闭导航菜单' }).first();
    await expect(overlayClose).toBeVisible();
    await overlayClose.click();
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible();

    for (const item of protectedPages) {
      await page.goto(item.path);
      await expect(page.getByText(item.text).first()).toBeVisible();
      await expectNoPageHorizontalOverflow(page);
    }
  });

  test('移动端高风险弹层 footer 可见', async ({ page, loginAsAdmin }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAsAdmin();

    await page.goto('/users');
    await page.getByRole('button', { name: '新增用户' }).click();
    const userDialog = page.getByRole('dialog', { name: '新增用户' });
    await expect(userDialog).toBeVisible();
    await expectInViewport(userDialog.getByRole('button', { name: '确定' }));
    await userDialog.getByRole('button', { name: '取消' }).click();

    await page.goto('/roles');
    await page.getByRole('button', { name: '新增角色' }).click();
    const roleDialog = page.getByRole('dialog', { name: '新增角色' });
    await expect(roleDialog).toBeVisible();
    await expectInViewport(roleDialog.getByRole('button', { name: '确定' }));
    await roleDialog.getByRole('button', { name: '取消' }).click();

    await page.goto('/files');
    await expect(page.getByText('被 Logo 或头像引用的媒体').first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });
});
