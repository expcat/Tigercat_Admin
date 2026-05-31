import { expect, test, uniqueSuffix } from './fixtures/auth';
import type { Page } from '@playwright/test';

const SITE_NAME_LABEL = '输入 site.name 的值';

async function gotoSettings(page: Page) {
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: '保存修改' })).toBeVisible();
  // 设置项为异步加载，必须等待 site.name 输入框填充真实值后再操作，避免后续 fill 被加载结果覆盖。
  await expect(siteNameInput(page)).not.toHaveValue('');
}

function siteNameInput(page: Page) {
  return page.getByRole('textbox', { name: SITE_NAME_LABEL });
}

async function saveSettings(page: Page) {
  await page.getByRole('button', { name: '保存修改' }).click();
  const dialog = page.getByRole('dialog', { name: '确认保存设置' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '确认保存' }).click();
  await expect(dialog).toBeHidden();
}

test.describe('系统设置主流程', () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin();
  });

  test('修改站点名称保存后可持久化', async ({ page }) => {
    await gotoSettings(page);
    const original =
      (await siteNameInput(page).inputValue()) || 'Tigercat Admin';
    const next = `E2E 站点 ${uniqueSuffix()}`;

    try {
      await siteNameInput(page).fill(next);
      await saveSettings(page);
      await expect(page.getByText('设置已保存').first()).toBeVisible();

      await gotoSettings(page);
      await expect(siteNameInput(page)).toHaveValue(next);
    } finally {
      // 还原站点名称，避免影响后续用例。
      await gotoSettings(page);
      await siteNameInput(page).fill(original);
      await saveSettings(page);
    }
  });

  test('取消保存确认不会持久化改动', async ({ page }) => {
    await gotoSettings(page);
    const input = siteNameInput(page);
    const original = await input.inputValue();

    await input.fill(`E2E 临时 ${uniqueSuffix()}`);
    await page.getByRole('button', { name: '保存修改' }).click();
    const dialog = page.getByRole('dialog', { name: '确认保存设置' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).toBeHidden();

    await gotoSettings(page);
    await expect(siteNameInput(page)).toHaveValue(original);
  });

  test('恢复默认值会重置表单为系统默认配置', async ({ page }) => {
    await gotoSettings(page);
    const input = siteNameInput(page);

    await input.fill(`E2E 改动 ${uniqueSuffix()}`);
    await page.getByRole('button', { name: '恢复默认值' }).click();
    await page
      .getByRole('dialog', { name: '恢复默认值' })
      .getByRole('button', { name: '恢复默认值' })
      .click();

    await expect(
      page.getByText('已恢复默认值，请确认保存修改').first(),
    ).toBeVisible();
    await expect(siteNameInput(page)).toHaveValue('Tigercat Admin');
  });
});
