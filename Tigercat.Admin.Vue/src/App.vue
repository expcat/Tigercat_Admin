<script setup lang="ts">
import { computed, ref, watch, provide, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ConfigProvider, Message, MessageContainer } from '@expcat/tigercat-vue'
import {
  SESSION_KEY,
  safeParse,
  apiRequest,
  createPermissionContext,
  PERMISSION_KEY,
  getThemePreferences,
  saveThemePreferences,
  applyTheme,
  watchSystemTheme,
  type Session,
  type ThemeMode,
  type ThemePreferences,
} from './utils'

const permission = createPermissionContext()

const router = useRouter()
const route = useRoute()

const changeForm = ref({ oldPassword: '', newPassword: '' })
const session = ref<Session | null>(safeParse(localStorage.getItem(SESSION_KEY)) || null)

const homeMessage = ref('')
const loading = ref(false)
const homeError = ref('')
const changeOpen = ref(false)

/* ── Theme ────────────────────────────────────── */
const themePrefs = ref<ThemePreferences>(getThemePreferences())

const updateTheme = (prefs: ThemePreferences) => {
  themePrefs.value = prefs
  saveThemePreferences(prefs)
  applyTheme(prefs)
}

const toggleThemeMode = () => {
  const order: ThemeMode[] = ['light', 'dark', 'system']
  const idx = order.indexOf(themePrefs.value.mode)
  const next = order[(idx + 1) % order.length]
  updateTheme({ ...themePrefs.value, mode: next })
}

// Apply theme immediately during setup (before first render)
applyTheme(themePrefs.value)

const unwatchSystem = watchSystemTheme(() => themePrefs.value)
onUnmounted(() => unwatchSystem())

const authHeaders = computed(() => (session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}))

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/dashboard'
  }

  if (value.startsWith('//') || value === '/login' || value === '/register') {
    return '/dashboard'
  }

  return value
}

const persistSession = (nextSession: Session | null) => {
  if (!nextSession) {
    localStorage.removeItem(SESSION_KEY)
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
  }
  session.value = nextSession
}

const onLoginSuccess = async (nextSession: Session) => {
  persistSession(nextSession)
  await Promise.all([
    loadHome(nextSession.token),
    permission.load(nextSession.token),
  ])
  router.push(getSafeReturnTo(route.query.redirect))
}

const loadHome = async (tokenOverride?: string) => {
  homeError.value = ''
  try {
    const payload = await apiRequest<string>('/api/home', {
      headers: tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : authHeaders.value,
    })
    homeMessage.value = payload?.data || ''
  } catch (error: any) {
    homeError.value = error.message
  }
}

const clearAuthenticatedState = () => {
  persistSession(null)
  permission.clear()
  homeMessage.value = ''
  homeError.value = ''
}

const handleLogout = () => {
  clearAuthenticatedState()
  router.push({ name: 'login' })
}

function handleStorage(event: StorageEvent) {
  if (event.key !== SESSION_KEY || event.newValue !== null) return
  clearAuthenticatedState()
  if (route.name !== 'login') {
    router.replace({ name: 'login' })
  }
}

function handleSessionExpired() {
  const redirect = route.fullPath
  clearAuthenticatedState()
  Message.warning({
    content: '会话已过期，请重新登录',
    duration: 3000
  })
  router.replace({ name: 'login', query: { redirect } })
}

onMounted(() => {
  window.addEventListener('storage', handleStorage)
  window.addEventListener('tigercat:session-expired', handleSessionExpired)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorage)
  window.removeEventListener('tigercat:session-expired', handleSessionExpired)
})

const handleChangePassword = async () => {
  loading.value = true
  try {
    const payload = await apiRequest<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify(changeForm.value),
    })
    Message.success({
      content: payload?.data?.message || '密码修改成功',
      duration: 3000
    })
    changeForm.value = { oldPassword: '', newPassword: '' }
    changeOpen.value = false
  } catch (error: any) {
    Message.error({
      content: error.message,
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}

// Load home data when entering dashboard & load permissions on page refresh
watch(
  () => route.name,
  (routeName) => {
    if (routeName === 'dashboard' && session.value?.token) {
      loadHome(session.value.token)
    }
  },
  { immediate: true }
)

// Load permissions when session exists but permissions haven't been loaded yet (e.g. page refresh)
if (session.value?.token && !permission.loaded.value) {
  permission.load(session.value.token)
}

provide('session', session)
provide('changeForm', changeForm)
provide('changeOpen', changeOpen)
provide('handleLogout', handleLogout)
provide('handleChangePassword', handleChangePassword)
provide('homeMessage', homeMessage)
provide('homeError', homeError)
provide(PERMISSION_KEY, permission)
provide('themePrefs', themePrefs)
provide('toggleThemeMode', toggleThemeMode)
provide('updateTheme', updateTheme)
</script>

<template>
  <ConfigProvider>
    <RouterView v-slot="{ Component }">
      <component :is="Component" @success="onLoginSuccess" />
    </RouterView>
    <MessageContainer />
  </ConfigProvider>
</template>
