<script setup lang="ts">
import { computed, ref, watch, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ConfigProvider, Message } from '@expcat/tigercat-vue'
import {
  SESSION_KEY,
  safeParse,
  apiRequest,
  createPermissionContext,
  PERMISSION_KEY,
  type Session,
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

const authHeaders = computed(() => (session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}))

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
  router.push({ name: 'dashboard' })
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

const handleLogout = () => {
  persistSession(null)
  permission.clear()
  homeMessage.value = ''
  homeError.value = ''
  router.push({ name: 'login' })
}

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
</script>

<template>
  <ConfigProvider>
    <RouterView v-slot="{ Component }">
      <component :is="Component" @success="onLoginSuccess" />
    </RouterView>
  </ConfigProvider>
</template>
