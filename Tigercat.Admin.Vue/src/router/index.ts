import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteLocationNormalized,
} from 'vue-router';
import { LoadingBar } from '@expcat/tigercat-vue/LoadingBar';
import {
  SESSION_KEY,
  safeParse,
  createPermissionContext,
  type Session,
} from '../utils';
import {
  loadShellMenuSchema,
  subscribeShellMenuSchema,
} from '../utils/shell-navigation';
import { buildVueSchemaChildren } from '../utils/schema-routes';
import ExceptionPage from '../pages/ExceptionPage.vue';

function isProtectedRoute(route: RouteLocationNormalized) {
  return route.matched.some((record) => record.meta.requiresAuth);
}

const routerMode = import.meta.env.VITE_TIGERCAT_ROUTER_MODE;
const basePath = import.meta.env.VITE_TIGERCAT_BASE_PATH || '/';
const routerBase = import.meta.env.VITE_TIGERCAT_ROUTER_BASE ?? basePath;

const router = createRouter({
  history:
    routerMode === 'hash'
      ? createWebHashHistory(routerBase)
      : createWebHistory(routerBase),
  routes: [
    {
      path: '/login',
      component: () => import('../components/GuestShell.vue'),
      meta: { requiresGuest: true },
      children: [
        {
          path: '',
          name: 'login',
          component: () => import('../pages/LoginPage.vue'),
        },
      ],
    },
    {
      path: '/register',
      component: () => import('../components/GuestShell.vue'),
      meta: { requiresGuest: true },
      children: [
        {
          path: '',
          name: 'register',
          component: () => import('../pages/RegisterPage.vue'),
        },
      ],
    },
    {
      path: '/forgot-password',
      component: () => import('../components/GuestShell.vue'),
      meta: { requiresGuest: true },
      children: [
        {
          path: '',
          name: 'forgot-password',
          component: () => import('../pages/ForgotPasswordPage.vue'),
        },
      ],
    },
    {
      path: '/register-success',
      component: () => import('../components/GuestShell.vue'),
      meta: { requiresGuest: true },
      children: [
        {
          path: '',
          name: 'register-success',
          component: () => import('../pages/RegisterSuccessPage.vue'),
        },
      ],
    },
    {
      path: '/',
      name: 'protected',
      component: () => import('../components/ProtectedShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        ...buildVueSchemaChildren(),
        {
          path: 'projects/:id',
          name: 'projects-detail',
          component: () => import('../pages/ProjectDetailPage.vue'),
          meta: { menuKey: 'projects' },
        },
        {
          path: 'approvals/:id',
          name: 'approvals-detail',
          component: () => import('../pages/ApprovalDetailPage.vue'),
          meta: { menuKey: 'approvals' },
        },
      ],
    },
    {
      path: '/403',
      name: 'exception403',
      component: ExceptionPage,
      props: { status: 403 },
    },
    {
      path: '/404',
      name: 'exception404',
      component: ExceptionPage,
      props: { status: 404 },
    },
    {
      path: '/500',
      name: 'exception500',
      component: ExceptionPage,
      props: { status: 500 },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/404',
    },
  ],
});

const permission = createPermissionContext();

function syncSchemaRoutes(
  payload: Parameters<typeof buildVueSchemaChildren>[0],
) {
  for (const record of buildVueSchemaChildren(payload)) {
    const name = typeof record.name === 'string' ? record.name : undefined;
    if (!name || router.hasRoute(name)) {
      continue;
    }
    router.addRoute('protected', record);
  }
}

subscribeShellMenuSchema(syncSchemaRoutes);
void loadShellMenuSchema().then(syncSchemaRoutes);

router.beforeEach(async (to, _from, next) => {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  const isAuthed = Boolean(session?.token);
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);
  const requiresPermission = to.matched
    .map((record) => record.meta.requiresPermission)
    .find(
      (code): code is string | string[] =>
        typeof code === 'string' || Array.isArray(code),
    );
  const showLoadingBar =
    isProtectedRoute(to) && to.fullPath !== _from.fullPath;

  if (showLoadingBar) {
    LoadingBar.start();
  }

  if (requiresAuth && !isAuthed) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (requiresGuest && isAuthed) {
    next({ name: 'dashboard' });
    return;
  }

  if (requiresPermission && isAuthed && session?.token) {
    if (!permission.loaded.value) {
      await permission.load(session.token);
    }
    if (!permission.loaded.value) {
      const stillAuthed = Boolean(
        safeParse<Session>(localStorage.getItem(SESSION_KEY))?.token,
      );
      // 401 会清会话并派发 session-expired；不要再跳到仪表盘，否则登录回跳丢失原目标页。
      if (!stillAuthed) {
        next({ name: 'login', query: { redirect: to.fullPath } });
        return;
      }
      // 权限接口失败时不要取消首次导航（会留下空白页）；
      // 已有来源页则留在原地，直开受限路由则退回首页。
      if (_from.matched.length === 0) {
        next({ name: 'dashboard' });
      } else {
        LoadingBar.finish();
        next(false);
      }
      return;
    }
    const requiredCodes = Array.isArray(requiresPermission)
      ? requiresPermission
      : [requiresPermission];
    if (!permission.has(...requiredCodes)) {
      next('/403');
      return;
    }
  }

  next();
});

router.afterEach(() => {
  LoadingBar.finish();
});

router.onError(() => {
  LoadingBar.finish();
});

export default router;
