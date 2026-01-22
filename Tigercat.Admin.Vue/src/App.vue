<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ConfigProvider, Container, Form, FormItem, Input, Modal } from '@expcat/tigercat-vue'
import HomePage from './pages/HomePage.vue'
import LoginPage from './pages/LoginPage.vue'
import RegisterPage from './pages/RegisterPage.vue'
import {
  SESSION_KEY,
  PAGE_KEYS,
  safeParse,
  getPageFromHash,
  apiRequest,
  debounce,
  useAuthForm
} from './utils'

interface Session {
  token: string;
  username: string;
  expiresAt: string;
}

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

const page = ref<string>('login')
const login = useAuthForm({ username: '', password: '' })
const register = useAuthForm({ username: '', password: '' })
const changeForm = ref({ oldPassword: '', newPassword: '' })

const session = ref<Session | null>(safeParse(localStorage.getItem(SESSION_KEY)) || null)
const homeMessage = ref('')
const loading = ref(false)
const notice = ref<Notice>({ type: '', message: '' })
const homeError = ref('')
const changeOpen = ref(false)
const activeMenu = ref('home')

const isAuthed = computed(() => Boolean(session.value?.token))
const authHeaders = computed(() => (session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}))

const persistSession = (nextSession: Session | null) => {
  if (!nextSession) {
    localStorage.removeItem(SESSION_KEY)
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
  }
  session.value = nextSession
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

const handleLogin = debounce(async () => {
  if (!login.validateForm()) return

  notice.value = { type: '', message: '' }
  loading.value = true
  try {
    const payload = await apiRequest<Session>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(login.form.value),
    })
    const nextSession: Session = {
      token: payload?.data?.token,
      username: payload?.data?.username,
      expiresAt: payload?.data?.expiresAt,
    }
    persistSession(nextSession)
    await loadHome(nextSession.token)
    window.location.hash = '/home'
  } catch (error: any) {
    notice.value = { type: 'error', message: error.message }
  } finally {
    loading.value = false
  }
}, 300)

const handleRegister = debounce(async () => {
  if (!register.validateForm()) return

  notice.value = { type: '', message: '' }
  loading.value = true
  try {
    const payload = await apiRequest<Session>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(register.form.value),
    })
    notice.value = {
      type: 'success',
      message: `用户 ${payload?.data?.username || register.form.value.username} 注册成功`,
    }
    window.location.hash = '/login'
  } catch (error: any) {
    notice.value = { type: 'error', message: error.message }
  } finally {
    loading.value = false
  }
}, 300)

const handleLogout = () => {
  persistSession(null)
  homeMessage.value = ''
  homeError.value = ''
  login.resetForm()
  register.resetForm()
  window.location.hash = '/login'
}

const handleChangePassword = async () => {
  notice.value = { type: '', message: '' }
  loading.value = true
  try {
    const payload = await apiRequest<{message: string}>('/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify(changeForm.value),
    })
    notice.value = { type: 'success', message: payload?.data?.message || '密码修改成功' }
    changeForm.value = { oldPassword: '', newPassword: '' }
    changeOpen.value = false
  } catch (error: any) {
    notice.value = { type: 'error', message: error.message }
  } finally {
    loading.value = false
  }
}

const handlePageSwitch = (target: string) => {
  if (PAGE_KEYS.includes(target)) {
    notice.value = { type: '', message: '' }
    login.errors.value = {}
    register.errors.value = {}
    window.location.hash = `/${target}`
  }
}

const syncPage = () => {
  page.value = getPageFromHash()
}

const ensureAuthPage = () => {
  if (!isAuthed.value && page.value === 'home') {
    window.location.hash = '/login'
  }
}

onMounted(() => {
  syncPage()
  window.addEventListener('hashchange', syncPage)
  if (session.value?.token) {
    loadHome(session.value.token)
    if (page.value !== 'home') {
      window.location.hash = '/home'
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncPage)
})

watch([isAuthed, page], ensureAuthPage)
</script>

<template>
  <ConfigProvider>
    <div class="min-h-screen bg-slate-50 p-6">
      <Container width="100%" :padding="false">
      <LoginPage
        v-if="!isAuthed && page === 'login'"
        :form="login.form.value"
        :errors="login.errors.value"
        :loading="loading"
        :notice="notice"
        @submit="handleLogin"
        @switch="handlePageSwitch"
        @update-field="login.setField"
      />

      <RegisterPage
        v-if="!isAuthed && page === 'register'"
        :form="register.form.value"
        :errors="register.errors.value"
        :loading="loading"
        :notice="notice"
        @submit="handleRegister"
        @switch="handlePageSwitch"
        @update-field="register.setField"
      />

      <HomePage
        v-if="isAuthed"
        :session="session"
        :notice="notice"
        :home-message="homeMessage"
        :home-error="homeError"
        :active-menu="activeMenu"
        @select-menu="(key) => (activeMenu = key)"
        @open-change="changeOpen = true"
        @logout="handleLogout"
      />

      <Modal v-model="changeOpen" title="修改密码" ok-text="确认修改" cancel-text="取消" @ok="handleChangePassword">
        <Form :model="changeForm" :label-width="88">
          <FormItem prop="oldPassword" label="旧密码">
            <Input v-model="changeForm.oldPassword" placeholder="请输入旧密码" />
          </FormItem>
          <FormItem prop="newPassword" label="新密码">
            <Input v-model="changeForm.newPassword" placeholder="请输入新密码" />
          </FormItem>
        </Form>
      </Modal>
      </Container>
    </div>
  </ConfigProvider>
</template>
