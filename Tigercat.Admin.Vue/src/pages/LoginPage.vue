<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, Button, Card, Form, FormItem, Input, Message } from '@expcat/tigercat-vue'
import { NumberKeyboard } from '@expcat/tigercat-vue/NumberKeyboard'
import { Countdown } from '@expcat/tigercat-vue/Countdown'
import { debounce, useAuthForm, apiRequest, type Session } from '../utils'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()

const emit = defineEmits<{
  (e: 'success', session: Session): void;
}>()

const { form, errors, setField, validateForm } = useAuthForm({ username: '', password: '' })
const loading = ref(false)
const otpStep = ref(false)
const otpUsername = ref('')
const otpCode = ref('')
const otpLoading = ref(false)
const resendUntil = ref(0)

interface LoginResult {
  requiresTwoFactor?: boolean
  token?: string
  username?: string
  expiresAt?: string
}

function startResendCountdown() {
  resendUntil.value = Date.now() + 60_000
}

function applySession(data: { token: string; username: string; expiresAt: string }) {
  emit('success', {
    token: data.token,
    username: data.username,
    expiresAt: data.expiresAt,
  })
}

const doLogin = debounce(async () => {
  try {
    const payload = await apiRequest<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(form.value),
    })

    if (!payload?.data) {
      throw new Error('API request failed');
    }

    if (payload.data.requiresTwoFactor) {
      otpUsername.value = payload.data.username || form.value.username || ''
      otpCode.value = ''
      otpStep.value = true
      startResendCountdown()
      return
    }

    if (!payload.data.token || !payload.data.username || !payload.data.expiresAt) {
      throw new Error('API request failed')
    }

    applySession({
      token: payload.data.token,
      username: payload.data.username,
      expiresAt: payload.data.expiresAt,
    })
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

const goToForgotPassword = () => {
  router.push({ name: 'forgot-password' })
}

const backToLogin = () => {
  otpStep.value = false
  otpCode.value = ''
  otpUsername.value = ''
  otpLoading.value = false
}

const handleResendFinish = () => {
  resendUntil.value = 0
}

const handleResend = () => {
  if (resendUntil.value > Date.now()) return
  startResendCountdown()
  Message.success({
    content: '验证码已重新发送（演示验证码：123456）',
    duration: 2500,
  })
}

const handleVerifyOtp = debounce(async () => {
  if (otpCode.value.length !== 6) {
    Message.warning({
      content: '请输入 6 位验证码',
      duration: 2000,
    })
    return
  }

  otpLoading.value = true
  try {
    const payload = await apiRequest<Session>('/api/auth/two-factor/verify', {
      method: 'POST',
      body: JSON.stringify({
        username: otpUsername.value,
        code: otpCode.value,
      }),
    })

    if (!payload?.data?.token) {
      throw new Error('API request failed')
    }
    if (!payload.data.username || !payload.data.expiresAt) {
      throw new Error('API request failed')
    }
    applySession({
      token: payload.data.token,
      username: payload.data.username,
      expiresAt: payload.data.expiresAt,
    })
  } catch (error: any) {
    Message.error({
      content: error.message,
      duration: 3000,
    })
  } finally {
    otpLoading.value = false
  }
}, 300)
</script>

<template>
  <div
    class="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-(--tiger-border,#e2e8f0) dark:border-slate-850 bg-(--tiger-bg-card,#ffffff) dark:bg-slate-900/90 backdrop-blur-md animate-fade-in-up"
    style="--tiger-primary: #4f46e5; --tiger-primary-hover: #4338ca; --tiger-primary-disabled: #c7d2fe; --tiger-focus-ring: #4f46e5;"
  >
    <!-- Left side: branding/decoration -->
    <div class="hidden md:flex md:w-[42%] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 flex-col justify-between text-white relative overflow-hidden">
      <!-- Glow blobs -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow" />
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
      <!-- Grid pattern overlay -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-8">
          <AppLogo :size="44" class="shadow-lg rounded-xl" />
          <span class="font-bold text-xl tracking-wider">Tigercat Admin</span>
        </div>
        
        <div class="space-y-6 my-auto pt-6">
          <h2 class="text-2xl font-bold leading-tight">极速、精美的全栈管理系统解决方案</h2>
          <div class="space-y-4 text-indigo-100 text-sm">
            <div class="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">1</span>
              <span>基于 .NET 10 Minimal API 与 Aspire 编排</span>
            </div>
            <div class="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">2</span>
              <span>接入 Tigercat UI 规范设计，支持无缝暗色模式</span>
            </div>
            <div class="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">3</span>
              <span>提供双端 (Vue/React) 一致的高质量用户体验</span>
            </div>
          </div>
        </div>
      </div>

      <div class="relative z-10 text-xs text-indigo-200/80">
        © 2026 Tigercat Team. All rights reserved.
      </div>
    </div>

    <!-- Right side: login form -->
    <div class="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center">
      <div class="md:hidden flex items-center justify-center gap-3 mb-6">
        <AppLogo :size="48" class="shadow-md rounded-xl" />
        <h2 class="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
      </div>
      
      <div class="mb-6 text-center md:text-left">
        <h1 class="p2-text-primary text-2xl font-bold tracking-tight">{{ otpStep ? '两步验证' : '欢迎回来' }}</h1>
        <p class="p2-text-secondary text-sm mt-1">{{ otpStep ? `请输入账号 ${otpUsername} 的 6 位验证码` : '请输入您的凭据登录系统' }}</p>
      </div>

      <Card variant="transparent" class="p-0">
        <Form v-if="!otpStep" :model="form" :label-width="88">
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
          <div class="mt-2 text-right text-sm">
            <button
              type="button"
              class="font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
              @click="goToForgotPassword"
            >
              忘记密码？
            </button>
          </div>
          <div class="mt-8 flex flex-col gap-3">
            <Button
              variant="primary"
              block
              :loading="loading"
              html-type="button"
              @click="handleLogin"
            >
              登录
            </Button>
            <div class="p2-text-secondary text-center text-sm">
              还没有账号？
              <button
                type="button"
                class="font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
                @click="goToRegister"
              >
                立即注册
              </button>
            </div>
          </div>
        </Form>
        <div v-else class="flex flex-col gap-4">
          <Alert type="info" title="演示验证码：123456" description="验证通过后才会写入会话，返回登录可重新输入凭据。" />
          <NumberKeyboard v-model="otpCode" mode="number" :max-length="6" />
          <div class="flex flex-col items-center gap-2">
            <Countdown
              v-if="resendUntil > 0"
              :value="resendUntil"
              format="s"
              suffix="秒"
              title="后可重新发送"
              @finish="handleResendFinish"
            />
            <Button
              v-else
              variant="outline"
              size="sm"
              html-type="button"
              @click="handleResend"
            >
            重新发送验证码
            </Button>
          </div>
          <Button
            variant="primary"
            block
            :loading="otpLoading"
            :disabled="otpCode.length !== 6"
            html-type="button"
            @click="handleVerifyOtp"
          >
            验证
          </Button>
          <button
            type="button"
            class="text-center text-sm font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
            @click="backToLogin"
          >
            返回登录
          </button>
        </div>
      </Card>
    </div>
  </div>
</template>
