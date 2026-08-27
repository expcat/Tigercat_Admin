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
      component: () => import('../components/ProtectedShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../pages/HomePage.vue'),
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('../pages/AnalyticsPage.vue'),
        },
        {
          path: 'monitor',
          name: 'monitor',
          component: () => import('../pages/MonitorPage.vue'),
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('../pages/ProjectsPage.vue'),
        },
        {
          path: 'projects/:id',
          name: 'projects-detail',
          component: () => import('../pages/ProjectDetailPage.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('../pages/ProfilePage.vue'),
        },
        {
          path: 'tickets',
          name: 'tickets',
          component: () => import('../pages/TicketsPage.vue'),
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('../pages/CalendarPage.vue'),
        },
        {
          path: 'content',
          name: 'content',
          component: () => import('../pages/ContentPage.vue'),
        },
        {
          path: 'gallery',
          name: 'gallery',
          component: () => import('../pages/GalleryPage.vue'),
        },
        {
          path: 'jobs',
          name: 'jobs',
          component: () => import('../pages/JobsPage.vue'),
        },
        {
          path: 'import',
          name: 'import',
          component: () => import('../pages/ImportPage.vue'),
        },
        {
          path: 'performance',
          name: 'performance',
          component: () => import('../pages/PerformancePage.vue'),
        },
        {
          path: 'help',
          name: 'help',
          component: () => import('../pages/HelpPage.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('../pages/ReportsPage.vue'),
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../pages/UsersPage.vue'),
          meta: { requiresPermission: 'user:view' },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('../pages/RolesPage.vue'),
          meta: { requiresPermission: 'role:view' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../pages/SettingsPage.vue'),
        },
        {
          path: 'files',
          name: 'files',
          component: () => import('../pages/FilesPage.vue'),
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('../pages/NotificationsPage.vue'),
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('../pages/TasksPage.vue'),
        },
        {
          path: 'audit-logs',
          name: 'audit',
          component: () => import('../pages/AuditLogsPage.vue'),
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('../pages/AboutPage.vue'),
        },
      ],
    },
    {
      path: '/403',
      name: 'exception403',
      component: () => import('../pages/ExceptionPage.vue'),
      props: { status: 403 },
    },
    {
      path: '/404',
      name: 'exception404',
      component: () => import('../pages/ExceptionPage.vue'),
      props: { status: 404 },
    },
    {
      path: '/500',
      name: 'exception500',
      component: () => import('../pages/ExceptionPage.vue'),
      props: { status: 500 },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/404',
    },
  ],
});

const permission = createPermissionContext();

router.beforeEach(async (to, _from, next) => {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  const isAuthed = Boolean(session?.token);
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);
  const requiresPermission = to.matched
    .map((record) => record.meta.requiresPermission)
    .find((code): code is string => typeof code === 'string');
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
    if (!permission.has(requiresPermission)) {
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
