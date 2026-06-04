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
  <div
    class="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-(--tiger-border,#e2e8f0) dark:border-slate-850 bg-(--tiger-bg-card,#ffffff) dark:bg-slate-900/90 backdrop-blur-md animate-fade-in-up"
    style="--tiger-primary: #7c3aed; --tiger-primary-hover: #6d28d9; --tiger-primary-disabled: #ddd6fe; --tiger-focus-ring: #7c3aed;"
  >
    <!-- Left side: branding/decoration -->
    <div class="hidden md:flex md:w-[42%] bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600 p-8 flex-col justify-between text-white relative overflow-hidden">
      <!-- Glow blobs -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow" />
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
      <!-- Grid pattern overlay -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-8">
          <AppLogo :size="44" class="shadow-lg rounded-xl" />
          <span class="font-bold text-xl tracking-wider">Tigercat Admin</span>
        </div>
        
        <div class="space-y-6 my-auto pt-6">
          <h2 class="text-2xl font-bold leading-tight">创建您的管理账号</h2>
          <div class="space-y-4 text-pink-100 text-sm">
            <div class="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">✓</span>
              <span>即刻体验全功能的后台管理系统</span>
            </div>
            <div class="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">✓</span>
              <span>体验基于 SQLite/Postgres 的完整业务闭环</span>
            </div>
            <div class="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">✓</span>
              <span>轻松配置您自己站点的配色、Logo 和安全策略</span>
            </div>
          </div>
        </div>
      </div>

      <div class="relative z-10 text-xs text-pink-200/80">
        © 2026 Tigercat Team. All rights reserved.
      </div>
    </div>

    <!-- Right side: register form -->
    <div class="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center">
      <div class="md:hidden flex items-center justify-center gap-3 mb-6">
        <AppLogo :size="48" class="shadow-md rounded-xl" />
        <h2 class="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
      </div>
      
      <div class="mb-6 text-center md:text-left">
        <h1 class="p2-text-primary text-2xl font-bold tracking-tight">创建账号</h1>
        <p class="p2-text-secondary text-sm mt-1">注册 Tigercat Admin 账号</p>
      </div>

      <!-- TODO: Request Card component enhancement to support variant="transparent" or a borderless prop -->
      <Card class="border-0 shadow-none bg-transparent p-0">
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
            <Button
              variant="primary"
              block
              :loading="loading"
              html-type="button"
              @click="handleRegister"
            >
              注册
            </Button>
            <div class="p2-text-secondary text-center text-sm">
              已有账号？
              <button
                type="button"
                class="font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
                @click="goToLogin"
              >
                立即登录
              </button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  </div>
</template>
