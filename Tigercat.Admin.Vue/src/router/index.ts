import { createRouter, createWebHistory } from 'vue-router'
import { SESSION_KEY, safeParse } from '../utils'
import type { Session } from '../utils'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/RegisterPage.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../pages/HomePage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../pages/UsersPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ]
})

// Navigation guard for authentication
router.beforeEach((to, _from, next) => {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY))
  const isAuthed = Boolean(session?.token)

  if (to.meta.requiresAuth && !isAuthed) {
    // Redirect to login if accessing protected route without auth
    next({ name: 'login' })
  } else if (to.meta.requiresGuest && isAuthed) {
    // Redirect to dashboard if accessing guest-only route while authenticated
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
