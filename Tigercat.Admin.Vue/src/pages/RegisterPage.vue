<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Form, FormItem, Input, Message } from '@expcat/tigercat-vue'
import { type AuthForm, debounce, useAuthForm, apiRequest } from '../utils'
import AppLogo from '../components/AppLogo.vue'

interface RegisterResult {
  username: string;
}

const router = useRouter()

const { form, errors, setField, validateForm } = useAuthForm({ username: '', password: '' })
const loading = ref(false)
const registerNoticeDuration = 3
const registerRedirectTimer = ref<number | null>(null)

const clearRegisterRedirectTimer = () => {
  if (registerRedirectTimer.value) {
    window.clearTimeout(registerRedirectTimer.value)
    registerRedirectTimer.value = null
  }
}

onBeforeUnmount(() => {
  clearRegisterRedirectTimer()
})

const doRegister = debounce(async () => {
  try {
    const payload = await apiRequest<RegisterResult>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(form.value),
    })
    const message = `用户 ${payload?.data?.username || form.value.username} 注册成功，${registerNoticeDuration} 秒后跳转登录`
    clearRegisterRedirectTimer()
    
    Message.success({
      content: message,
      duration: registerNoticeDuration * 1000
    })

    registerRedirectTimer.value = window.setTimeout(() => {
      router.push({ name: 'login' })
    }, registerNoticeDuration * 1000)
  } catch (error: any) {
    clearRegisterRedirectTimer()
    Message.error({
      content: error.message,
      duration: registerNoticeDuration * 1000
    })
  } finally {
    loading.value = false
  }
}, 300)

const handleRegister = () => {
  if (!validateForm()) return
  loading.value = true
  doRegister()
}

const goToLogin = () => {
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="w-full max-w-md mx-auto px-1 sm:px-0">
    <!-- Logo & Welcome -->
    <div class="text-center mb-8">
      <div class="inline-flex mb-4">
        <AppLogo :size="64" />
      </div>
      <h1 class="p2-text-primary text-2xl font-semibold">创建账号</h1>
      <p class="p2-text-secondary mt-1">注册 Tigercat Admin 账号</p>
    </div>

    <Card class="shadow-xl border-0">
      <Form :model="form" :label-width="88">
        <FormItem prop="username" label="用户名">
          <Input
            :model-value="form.username"
            placeholder="请输入用户名"
            :status="errors?.username ? 'error' : ''"
            :error-message="errors?.username"
            @update:model-value="(val) => setField('username', val)"
          />
        </FormItem>
        <FormItem prop="password" label="密码">
          <Input
            :model-value="form.password"
            type="password"
            placeholder="请输入密码"
            :status="errors?.password ? 'error' : ''"
            :error-message="errors?.password"
            @update:model-value="(val) => setField('password', val)"
          />
        </FormItem>
        <div class="mt-8 flex flex-col gap-3">
          <Button variant="primary" block :loading="loading" html-type="button" @click="handleRegister">注册</Button>
          <div class="p2-text-secondary text-center text-sm">
            已有账号？
            <button
              type="button"
              class="font-medium text-(--tiger-primary,#3b82f6) hover:underline"
              @click="goToLogin"
            >
              立即登录
            </button>
          </div>
        </div>
      </Form>
    </Card>
  </div>
</template>
