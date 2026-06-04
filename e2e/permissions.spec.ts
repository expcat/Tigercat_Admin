import { expect, SESSION_KEY, test, uniqueSuffix } from './fixtures/auth';
import type { Page } from '@playwright/test';

type Session = {
  token: string;
};

type PermissionInfo = {
  id: number;
  code: string;
};

type RoleDetail = {
  id: number;
  name: string;
};

type UserItem = {
  id: number;
  username: string;
};

type PagedResponse<T> = {
  items: T[];
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

async function apiRequest<T>(
  page: Page,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  return page.evaluate(
    async ({ key, path, options }) => {
      const session = JSON.parse(window.localStorage.getItem(key) || 'null') as Session | null;
      if (!session?.token) {
        throw new Error('Missing admin session');
      }

      const response = await fetch(path, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `Request failed: ${response.status}`);
      }

      return payload.data as T;
    },
    { key: SESSION_KEY, path, options },
  );
}

async function publicApiRequest<T>(
  page: Page,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  return page.evaluate(
    async ({ path, options }) => {
      const response = await fetch(path, {
        method: options.method ?? 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `Request failed: ${response.status}`);
      }

      return payload.data as T;
    },
    { path, options },
  );
}

async function createLimitedUser(page: Page, username: string, password: string) {
  await publicApiRequest(page, '/api/auth/register', {
    method: 'POST',
    body: { username, password },
  });

  const permissions = await apiRequest<PermissionInfo[]>(page, '/api/roles/permissions');
  const permissionIds = permissions
    .filter((permission) => ['dashboard:view', 'user:view'].includes(permission.code))
    .map((permission) => permission.id);

  const role = await apiRequest<RoleDetail>(page, '/api/roles', {
    method: 'POST',
    body: {
      name: `${username}_role`,
      description: 'E2E limited permissions role',
      permissionIds,
    },
  });

  let user: UserItem;
  try {
    user = await apiRequest<UserItem>(page, '/api/users', {
      method: 'POST',
      body: {
        username,
        password,
        displayName: 'E2E 有限权限用户',
        roleIds: [role.id],
      },
    });
  } catch {
    const users = await apiRequest<PagedResponse<UserItem>>(
      page,
      `/api/users?page=1&pageSize=10&keyword=${encodeURIComponent(username)}`,
    );
    const existingUser = users.items.find((item) => item.username === username);
    if (!existingUser) {
      throw new Error(`Cannot find registered user: ${username}`);
    }

    user = await apiRequest<UserItem>(page, `/api/users/${existingUser.id}`, {
      method: 'PUT',
      body: {
        displayName: 'E2E 有限权限用户',
        roleIds: [role.id],
      },
    });
  }

  return { role, user };
}

async function cleanupLimitedUser(
  page: Page,
  user: UserItem | null,
  role: RoleDetail | null,
) {
  await page.evaluate((key) => window.localStorage.removeItem(key), SESSION_KEY);
  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  if (user) {
    await apiRequest(page, `/api/users/${user.id}`, { method: 'DELETE' });
  }

  if (role) {
    await apiRequest(page, `/api/roles/${role.id}`, { method: 'DELETE' });
  }
}

test.describe('前端权限守卫回归', () => {
  test('有限权限用户只能查看用户列表，不能看到创建和删除入口', async ({
    page,
    loginAsAdmin,
    logout,
  }) => {
    const suffix = uniqueSuffix();
    const username = `e2e_limited_${suffix}`;
    const password = 'e2e_pass123';
    let role: RoleDetail | null = null;
    let user: UserItem | null = null;

    await loginAsAdmin();

    try {
      ({ role, user } = await createLimitedUser(page, username, password));
      await logout();

      await page.getByPlaceholder('请输入用户名').fill(username);
      await page.getByPlaceholder('请输入密码').fill(password);
      await page.getByRole('button', { name: '登录' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto('/users');
      await expect(page).toHaveURL(/\/users$/);
      await expect(page.getByText('用户管理').first()).toBeVisible();
      await expect(page.getByRole('button', { name: '新增用户' })).toBeHidden();
      await expect(page.getByRole('button', { name: '批量启用' })).toBeHidden();
      await expect(page.getByRole('button', { name: '批量禁用' })).toBeHidden();
      await expect(page.getByRole('button', { name: '批量删除' })).toBeHidden();
      await expect(page.getByRole('button', { name: '删除', exact: true })).toHaveCount(0);
    } finally {
      await cleanupLimitedUser(page, user, role);
    }
  });
});
