<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ConfigProvider, Container, Form, FormItem, Input, Modal, Message } from '@expcat/tigercat-vue'
import MainLayout from './components/MainLayout.vue'
import {
  SESSION_KEY,
  safeParse,
  apiRequest,
  type Session,
} from './utils'

const router = useRouter()
const route = useRoute()

const changeForm = ref({ oldPassword: '', newPassword: '' })
const session = ref<Session | null>(safeParse(localStorage.getItem(SESSION_KEY)) || null)

const homeMessage = ref('')
const loading = ref(false)
const homeError = ref('')
const changeOpen = ref(false)

const isAuthed = computed(() => Boolean(session.value?.token))
const authHeaders = computed(() => (session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}))

// Track if we're on a protected route (dashboard)
const isProtectedRoute = computed(() => route.meta?.requiresAuth === true)

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
  await loadHome(nextSession.token)
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

// Load home data when entering dashboard
watch(
  () => route.name,
  (routeName) => {
    if (routeName === 'dashboard' && session.value?.token) {
      loadHome(session.value.token)
    }
  },
  { immediate: true }
)
</script>

<template>
  <ConfigProvider>
    <!-- Guest routes (login/register) -->
    <div v-if="!isProtectedRoute" class="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <Container width="100%" :padding="false" class="w-full max-w-4xl">
        <RouterView @success="onLoginSuccess" />
      </Container>
    </div>

    <!-- Protected routes (dashboard) -->
    <MainLayout
      v-else
      :session="session"
      @logout="handleLogout"
      @change-password="changeOpen = true"
    >
      <RouterView
        :home-message="homeMessage"
        :home-error="homeError"
        :username="session?.username"
      />
        
      <Modal
        v-model="changeOpen"
        title="修改密码"
        ok-text="确认修改"
        cancel-text="取消"
        @ok="handleChangePassword"
        @cancel="changeOpen = false"
      >
        <Form :model="changeForm" :label-width="88">
          <FormItem name="oldPassword" label="旧密码">
            <Input
              v-model="changeForm.oldPassword"
              placeholder="请输入旧密码"
            />
          </FormItem>
          <FormItem name="newPassword" label="新密码">
            <Input
              v-model="changeForm.newPassword"
              placeholder="请输入新密码"
            />
          </FormItem>
        </Form>
      </Modal>
    </MainLayout>
  </ConfigProvider>
</template>
