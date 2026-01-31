<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Form, FormItem, Input, Message } from '@expcat/tigercat-vue'
import { debounce, useAuthForm, apiRequest, type Session } from '../utils'

const router = useRouter()

const emit = defineEmits<{
  (e: 'success', session: Session): void;
}>()

const { form, errors, setField, validateForm } = useAuthForm({ username: '', password: '' })
const loading = ref(false)

const doLogin = debounce(async () => {
  try {
    const payload = await apiRequest<{ token: string; username: string; expiresAt: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(form.value),
    })
    
    if (!payload?.data) {
      throw new Error('API request failed');
    }

    const nextSession: Session = {
      token: payload.data.token,
      username: payload.data.username,
      expiresAt: payload.data.expiresAt,
    }
    emit('success', nextSession)
  } catch (error: any) {
    Message.error({
      content: error.message,
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}, 300)

const handleLogin = () => {
  if (!validateForm()) return
  loading.value = true
  doLogin()
}

const goToRegister = () => {
  router.push({ name: 'register' })
}
</script>

<template>
  <div class="w-full max-w-md mx-auto">
    <!-- Logo & Welcome -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
        <span class="text-2xl font-bold text-white">T</span>
      </div>
      <h1 class="text-2xl font-semibold text-gray-800">欢迎回来</h1>
      <p class="text-gray-500 mt-1">登录到 Tigercat Admin</p>
    </div>

    <Card class="shadow-xl border-0">
      <Form :model="form" :label-width="88">
        <FormItem name="username" label="用户名">
          <Input
            :model-value="form.username || ''"
            placeholder="请输入用户名"
            @update:model-value="(val: string) => setField('username', val)"
            :status="errors?.username ? 'error' : undefined"
            :error-message="errors?.username"
          />
        </FormItem>
        <FormItem name="password" label="密码">
          <Input
            :model-value="form.password || ''"
            type="password"
            placeholder="请输入密码"
            @update:model-value="(val: string) => setField('password', val)"
            :status="errors?.password ? 'error' : undefined"
            :error-message="errors?.password"
          />
        </FormItem>
        <div class="mt-8 flex flex-col gap-3">
          <Button
            variant="primary"
            block
            :loading="loading"
            type="button"
            @click="handleLogin"
          >
            登录
          </Button>
          <div class="text-center text-sm text-gray-500">
            还没有账号？
            <button
              type="button"
              class="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              @click="goToRegister"
            >
              立即注册
            </button>
          </div>
        </div>
      </Form>
    </Card>
  </div>
</template>
