import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import { SESSION_KEY, safeParse } from '../utils';
import type { Session } from '../utils';

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
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('../pages/RolesPage.vue'),
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
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  const isAuthed = Boolean(session?.token);
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

  if (requiresAuth && !isAuthed) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (requiresGuest && isAuthed) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
