import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export function isDemoProject(testInfo: TestInfo): boolean {
  return testInfo.project.name.includes('demo');
}

export function isVueProject(testInfo: TestInfo): boolean {
  return testInfo.project.name.includes('vue');
}

/** Hash demo preview uses `/#/path`; API suite uses history `/path`. */
export function appPath(testInfo: TestInfo, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return isDemoProject(testInfo) ? `/#${normalized}` : normalized;
}

export function appRoot(page: Page): Locator {
  return page.locator('#app, #root').first();
}

export async function expectNoPageHorizontalOverflow(page: Page): Promise<void> {
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

export async function expectFocused(locator: Locator): Promise<void> {
  await expect
    .poll(async () =>
      locator.evaluate((element) => {
        const active = document.activeElement;
        return active === element || element.contains(active);
      }),
    )
    .toBe(true);
}

export async function expectInViewport(locator: Locator): Promise<void> {
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

/** Ticket detail ActionBar is pinned to the pane (no inner scroll to reach 同意/拒绝). */
export async function expectTicketActionBarFirstScreen(page: Page): Promise<void> {
  const action = page.locator('[data-ticket-detail-action]').first();
  await expect(action).toBeVisible();
  const fullyInPane = await page.evaluate(() => {
    const paneEl = document.querySelector('[data-ticket-detail-pane]');
    const actionEl = document.querySelector('[data-ticket-detail-action]');
    if (!paneEl || !actionEl) return false;
    const pr = paneEl.getBoundingClientRect();
    const ar = actionEl.getBoundingClientRect();
    return ar.top >= pr.top - 1 && ar.bottom <= pr.bottom + 1;
  });
  expect(fullyInPane).toBe(true);
}

/**
 * Vue overlay-host insertBefore used to leave `#app` as an empty ConfigProvider
 * after leaving Shell for 403/404. Require real page chrome, not just host roots.
 */
export async function expectAppNotEmptyShell(page: Page): Promise<void> {
  const root = appRoot(page);
  await expect(root).toBeVisible();
  await expect
    .poll(async () =>
      root.evaluate((element) => {
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
        const hasChrome = Boolean(
          element.querySelector(
            'input, button, form, [role="heading"], [role="dialog"], [data-testid="shell-tags-view"]',
          ),
        );
        return text.length > 0 && hasChrome;
      }),
    )
    .toBe(true);
}

export async function expectDarkSchemeApplied(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveClass(/dark/);
}

export async function suppressOnboardingTour(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('tigercat-admin:onboarding-tour:done', '1');
    } catch {
      /* ignore storage errors */
    }
  });
}

export async function loginAsAdmin(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  await suppressOnboardingTour(page);
  await page.goto(appPath(testInfo, '/login'));
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function loginAsDemo(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  await suppressOnboardingTour(page);
  await page.goto(appPath(testInfo, '/login'));
  await page.getByPlaceholder('请输入用户名').fill('demo');
  await page.getByPlaceholder('请输入密码').fill('demo');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.getByRole('heading', { name: '两步验证' })).toBeVisible();
}

export async function logoutFromHeader(page: Page, testInfo: TestInfo): Promise<void> {
  await page.locator('.p2-header-user-btn').click();
  await page.getByText('退出登录').click();
  await expect(page).toHaveURL(
    isDemoProject(testInfo) ? /#\/login$/ : /\/login$/,
  );
}
