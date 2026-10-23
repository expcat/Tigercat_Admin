<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Input } from '@expcat/tigercat-vue/Input'
import { Message } from '@expcat/tigercat-vue/Message'
import { InputOTP } from '@expcat/tigercat-vue/InputOTP'
import { Countdown } from '@expcat/tigercat-vue/Countdown'
import {
  useAuthForm,
  apiRequest,
  DEMO_OTP_CODE,
  OTP_LENGTH,
  OTP_RESEND_MS,
  type LoginData,
  type Session,
} from '../utils'
import type { FormRules } from '@expcat/tigercat-core'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()
const route = useRoute()
let request: AbortController | null = null
const usernameRef = ref<{ focus: () => void } | null>(null)
const otpRef = ref<{ focus: () => void } | null>(null)
onBeforeUnmount(() => request?.abort())
const authRules: FormRules = {
  username: { required: true, transform: (value) => String(value ?? '').trim(), message: '请输入用户名' },
  password: { required: true, message: '请输入密码' },
}

const emit = defineEmits<{
  (e: 'success', session: Session): void;
}>()

const { form, setField } = useAuthForm({ username: '', password: '' })
const loading = ref(false)
const step = ref<'login' | 'otp'>('login')
const otpUsername = ref('')
const otpCode = ref('')
const otpChallengeId = ref('')
const otpDeadline = ref<number | null>(null)
const otpCanResend = ref(false)
const otpError = ref('')
const otpNotice = ref('')

function startOtp(username: string, challengeId?: string) {
  otpUsername.value = username
  otpCode.value = ''
  otpChallengeId.value = challengeId || ''
  otpCanResend.value = false
  otpDeadline.value = Date.now() + OTP_RESEND_MS
  otpError.value = ''
  otpNotice.value = ''
  step.value = 'otp'
}

function applySession(data: { token: string; username: string; expiresAt: string }) {
  emit('success', {
    token: data.token,
    username: data.username,
    expiresAt: data.expiresAt,
  })
}

async function handleLogin(resend = false) {
  if (request && !request.signal.aborted) return
  const controller = new AbortController()
  request = controller
  loading.value = true
  otpError.value = ''
  otpNotice.value = ''
  try {
    const payload = await apiRequest<LoginData>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...form.value, username: form.value.username?.trim() }),
      signal: controller.signal,
    })
    if (controller.signal.aborted) return
    const data = payload?.data
    if (data?.requiresTwoFactor) {
      startOtp(data.username || form.value.username?.trim() || '', data.challengeId)
      if (resend) otpNotice.value = '验证码已重新获取，演示验证码：' + DEMO_OTP_CODE
    } else {
      if (!data?.token || !data.username || !data.expiresAt) throw new Error('登录响应不完整，请重试')
      applySession({ token: data.token, username: data.username, expiresAt: data.expiresAt })
    }
  } catch (error: unknown) {
    if (controller.signal.aborted) return
    const content = error instanceof Error ? error.message : '登录失败，请重试'
    if (resend) otpError.value = content
    Message.error({ content, duration: 3000 })
  } finally {
    if (request === controller && !controller.signal.aborted) {
      request = null
      loading.value = false
    }
  }
}

const goToRegister = () => router.push({ name: 'register', query: route.query })
const goToForgotPassword = () => router.push({ name: 'forgot-password', query: route.query })

function backToLogin() {
  request?.abort()
  request = null
  step.value = 'login'
  void nextTick(() => usernameRef.value?.focus())
  otpCode.value = ''
  otpUsername.value = ''
  otpChallengeId.value = ''
  otpDeadline.value = null
  otpCanResend.value = false
  otpError.value = ''
  otpNotice.value = ''
  loading.value = false
}

function handleResend() {
  if (otpCanResend.value && !loading.value) void handleLogin(true)
}

async function handleVerify() {
  if (request || otpCode.value.length !== OTP_LENGTH) return
  const controller = new AbortController()
  request = controller
  loading.value = true
  otpError.value = ''
  otpNotice.value = ''
  try {
    const payload = await apiRequest<Session>('/api/auth/two-factor/verify', {
      method: 'POST',
      body: JSON.stringify({ username: otpUsername.value, code: otpCode.value, challengeId: otpChallengeId.value || undefined }),
      signal: controller.signal,
    })
    if (controller.signal.aborted) return
    const data = payload?.data
    if (!data?.token || !data.username || !data.expiresAt) throw new Error('登录响应不完整，请重试')
    applySession(data)
  } catch (error: unknown) {
    if (controller.signal.aborted) return
    otpError.value = error instanceof Error ? error.message : '验证码校验失败，请重试'
    Message.error({ content: otpError.value, duration: 3000 })
    void nextTick(() => otpRef.value?.focus())
  } finally {
    if (request === controller && !controller.signal.aborted) {
      request = null
      loading.value = false
    }
  }
}
</script>

<template>
  <div
    class="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-lg border border-(--tiger-border,#e2e8f0)/30 bg-(--tiger-surface) animate-fade-in-up motion-reduce:animate-none"
    style="--tiger-primary: #4f46e5; --tiger-primary-hover: #4338ca; --tiger-primary-disabled: #c7d2fe; --tiger-focus-ring: #4f46e5;"
  >
    <!-- Left side: branding/decoration -->
    <div class="hidden md:flex md:w-[42%] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 flex-col justify-between text-white relative overflow-hidden">
      <!-- Glow blobs -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
      <!-- Grid pattern overlay -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-8">
          <AppLogo :size="44" class="shadow-lg rounded-xl" />
          <span class="font-bold text-xl tracking-wider">Tigercat Admin</span>
        </div>
        
        <div class="space-y-6 my-auto pt-6">
          <h2 class="text-2xl font-bold leading-tight">
            极速、精美的全栈<br />管理系统解决方案
          </h2>
          <div class="space-y-4 text-pretty text-indigo-100 text-sm">
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
        <h1 class="p2-text-primary text-2xl font-bold tracking-tight">{{ step === 'otp' ? '两步验证' : '欢迎回来' }}</h1>
        <p class="p2-text-secondary text-sm mt-1">{{ step === 'otp' ? `请输入账号 ${otpUsername} 的 6 位验证码` : '请输入您的凭据登录系统' }}</p>
      </div>

      <Card variant="transparent" class="p-0">
        <Form v-if="step === 'login'" :model-value="form" :rules="authRules" :label-width="88" :loading="loading" @submit="({ valid }) => { if (valid) handleLogin() }">
          <FormItem name="username" label="用户名">
            <Input
              ref="usernameRef"
              :model-value="form.username || ''"
              placeholder="请输入用户名"
              @update:model-value="(val: string) => setField('username', val)"
              auto-complete="username"
              :disabled="loading"
            />
          </FormItem>
          <FormItem name="password" label="密码">
            <Input
              :model-value="form.password || ''"
              type="password"
              placeholder="请输入密码"
              @update:model-value="(val: string) => setField('password', val)"
              auto-complete="current-password"
              :disabled="loading"
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
              type="submit"
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
          <Alert v-if="otpError" type="error" :title="otpError" />
          <Alert v-if="otpNotice" type="success" :title="otpNotice" />
          <div data-testid="auth-otp-input" class="flex justify-center">
            <InputOTP
              ref="otpRef"
              :model-value="otpCode"
              :disabled="loading"
              :status="otpError ? 'error' : undefined"
              @update:model-value="(value: string) => { otpCode = value; otpError = '' }"
              @keydown.enter.prevent="handleVerify"
              :length="OTP_LENGTH"
              type="numeric"
              auto-focus
              aria-label="验证码"
            />
          </div>
          <div class="flex flex-col items-center gap-2 min-h-8">
            <Countdown
              v-if="otpDeadline && !otpCanResend"
              :value="otpDeadline"
              format="s"
              suffix="秒后可重新获取"
              title="演示验证码"
              @finish="otpCanResend = true"
            />
            <button
              v-else
              type="button"
              class="text-sm font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
              :disabled="loading"
              @click="handleResend"
            >
              重新获取验证码
            </button>
          </div>
          <Button
            variant="primary"
            block
            :loading="loading"
            :disabled="otpCode.length !== OTP_LENGTH"
            type="button"
            @click="handleVerify"
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
