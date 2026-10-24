<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Input } from '@expcat/tigercat-vue/Input'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Message } from '@expcat/tigercat-vue/Message'
import { Steps, StepsItem } from '@expcat/tigercat-vue/Steps'
import { Result } from '@expcat/tigercat-vue/Result'
import { Countdown } from '@expcat/tigercat-vue/Countdown'
import { InputOTP } from '@expcat/tigercat-vue/InputOTP'
import { MaskInput } from '@expcat/tigercat-vue/MaskInput'
import {
  apiRequest,
  ApiError,
  DEMO_OTP_CODE,
  detectForgotChannel,
  isPhoneIdentity,
  OTP_LENGTH,
  OTP_RESEND_MS,
  PHONE_MASK,
} from '../utils'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()
const route = useRoute()
const pageRef = ref<HTMLElement | null>(null)
let request: AbortController | null = null
onBeforeUnmount(() => request?.abort())
const current = ref(0)
const loading = ref(false)
const codeLoading = ref(false)
const target = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const sentTo = ref('')
const sentTarget = ref('')
const submitError = ref('')
const targetError = ref('')
const codeError = ref('')
const passwordError = ref('')
const confirmError = ref('')
const canResend = ref(true)
const codeDeadline = ref<number | null>(null)

const usePhoneMask = computed(() => isPhoneIdentity(target.value))
const focusField = (name: string) => void nextTick(() => {
  pageRef.value?.querySelector<HTMLInputElement>(name === 'code'
    ? '[data-testid="auth-otp-input"] input:not([type="hidden"])'
    : name === 'target' ? 'input[autocomplete="username"]'
    : `input[name="${name}"]`)?.focus()
})
const normalizeTarget = (value: string) => value.includes('@') ? value.trim() : value.replace(/\s/g, '')
const goToLogin = () => router.push({ name: 'login', query: route.query })

function placeIdentityCaret() {
  const input = pageRef.value?.querySelector<HTMLInputElement>('input[autocomplete="username"]')
  if (!input) return
  input.focus()
  const pos = input.value.length
  input.setSelectionRange(pos, pos)
}

function handleTargetChange(value: string) {
  if (normalizeTarget(value) !== normalizeTarget(target.value)) {
    request?.abort()
    request = null
    codeLoading.value = false
    sentTarget.value = ''
    sentTo.value = ''
    code.value = ''
    codeError.value = ''
    canResend.value = true
    codeDeadline.value = null
    submitError.value = ''
  }
  const modeChanged = isPhoneIdentity(value) !== usePhoneMask.value
  target.value = value
  targetError.value = ''
  if (modeChanged) void nextTick(placeIdentityCaret)
}

function validateIdentity() {
  const value = normalizeTarget(target.value)
  const valid = value.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : /^1\d{10}$/.test(value)
  targetError.value = valid ? '' : '请输入有效的邮箱或 11 位手机号'
  if (!valid) focusField('target')
  return valid
}

async function sendCode() {
  if (request || !canResend.value || !validateIdentity()) return
  const nextTarget = normalizeTarget(target.value)
  const controller = new AbortController()
  request = controller
  submitError.value = ''
  codeLoading.value = true
  try {
    const payload = await apiRequest<{ sentTo: string }>('/api/auth/forgot-password/code', {
      method: 'POST',
      body: JSON.stringify({ channel: detectForgotChannel(nextTarget), target: nextTarget }),
      signal: controller.signal,
    })
    if (controller.signal.aborted) return
    sentTo.value = payload?.data?.sentTo || nextTarget
    sentTarget.value = nextTarget
    code.value = ''
    codeError.value = ''
    canResend.value = false
    codeDeadline.value = Date.now() + OTP_RESEND_MS
    Message.success({ content: '已获取验证信息：' + sentTo.value, duration: 2500 })
    focusField('code')
  } catch (error: unknown) {
    if (!controller.signal.aborted) submitError.value = error instanceof Error ? error.message : '获取验证码失败，请重试'
  } finally {
    if (request === controller && !controller.signal.aborted) {
      request = null
      codeLoading.value = false
    }
  }
}

function submitIdentity() {
  if (codeLoading.value || !validateIdentity()) return
  if (!sentTarget.value || sentTarget.value !== normalizeTarget(target.value)) {
    targetError.value = '请先为当前账号获取验证码'
    focusField('target')
    return
  }
  if (!/^\d{6}$/.test(code.value)) {
    codeError.value = '请输入 6 位验证码'
    focusField('code')
    return
  }
  codeError.value = ''
  submitError.value = ''
  current.value = 1
  focusField('password')
}

function backToIdentity() {
  request?.abort()
  request = null
  loading.value = false
  submitError.value = ''
  current.value = 0
  focusField('code')
}

async function submitPassword() {
  if (request) return
  passwordError.value = password.value.length < 6 ? '密码长度不能少于 6 位' : ''
  confirmError.value = confirmPassword.value !== password.value ? '两次输入的密码不一致' : ''
  if (passwordError.value || confirmError.value) {
    focusField(passwordError.value ? 'password' : 'confirmPassword')
    return
  }
  const controller = new AbortController()
  request = controller
  submitError.value = ''
  loading.value = true
  try {
    await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ channel: detectForgotChannel(sentTarget.value), target: sentTarget.value, code: code.value, password: password.value }),
      signal: controller.signal,
    })
    if (!controller.signal.aborted) current.value = 2
  } catch (error: unknown) {
    if (controller.signal.aborted) return
    const content = error instanceof Error ? error.message : '重置失败，请重试'
    if (error instanceof ApiError && error.status === 400 && content.includes('验证码')) {
      current.value = 0
      codeError.value = content
      focusField('code')
    } else if (error instanceof ApiError && error.status === 400 && content.includes('密码')) {
      passwordError.value = content
      focusField('password')
    } else submitError.value = content
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
    ref="pageRef"
    class="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-x-clip overflow-y-visible shadow-lg border border-(--tiger-border,#e2e8f0)/30 bg-(--tiger-surface) animate-fade-in-up motion-reduce:animate-none"
    style="--tiger-primary: light-dark(#4f46e5, #a5b4fc); --tiger-primary-foreground: light-dark(#ffffff, #0f172a); --tiger-primary-hover: light-dark(#4338ca, #c7d2fe); --tiger-primary-disabled: light-dark(#c7d2fe, #3730a3); --tiger-focus-ring: light-dark(#4f46e5, #a5b4fc);"
  >
    <div class="hidden md:flex md:w-[42%] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 flex-col justify-between text-white relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-8">
          <AppLogo :size="44" class="shadow-lg rounded-xl" />
          <span class="font-bold text-xl tracking-wider">Tigercat Admin</span>
        </div>
        <div class="space-y-6 my-auto pt-6">
          <h2 class="text-2xl font-bold leading-tight">找回账号访问权限</h2>
          <div class="space-y-4 text-pretty text-indigo-100 text-sm">
            <div class="flex items-center gap-3">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">1</span>
              <span>验证邮箱或手机号身份</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">2</span>
              <span>设置不少于 6 位的新密码</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">3</span>
              <span>完成后返回登录继续使用</span>
            </div>
          </div>
        </div>
      </div>
      <div class="relative z-10 text-xs text-indigo-200/80">
        © 2026 Tigercat Team. All rights reserved.
      </div>
    </div>

    <div class="w-full md:w-[58%] p-6 md:p-10 flex flex-col justify-center min-w-0">
      <div class="md:hidden flex items-center justify-center gap-3 mb-6">
        <AppLogo :size="48" class="shadow-md rounded-xl" />
        <h2 class="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
      </div>

      <div class="mb-6 text-center md:text-left">
        <h1 class="p2-text-primary text-2xl font-bold tracking-tight">忘记密码</h1>
        <p class="p2-text-secondary text-sm mt-1">通过邮箱或手机号重置登录密码</p>
      </div>

      <Card variant="transparent" class="p-0">
        <div class="mb-6 overflow-x-auto">
          <Steps :current="current" size="sm">
            <StepsItem title="填写验证信息" description="邮箱 / 手机号" />
            <StepsItem title="设置新密码" description="不少于 6 位" />
            <StepsItem title="完成" description="返回登录" />
          </Steps>
        </div>

        <Alert v-if="submitError" type="error" :title="submitError" class="mb-4" show-icon />
        <Form v-if="current === 0" class="min-w-0" :label-width="72" @submit="submitIdentity">
          <FormItem label="账号">
            <div v-if="usePhoneMask" data-testid="forgot-phone-mask">
              <MaskInput
                name="target"
                auto-complete="username"
                :model-value="target"
                :mask="PHONE_MASK"
                placeholder="请输入邮箱或手机号"
                :status="targetError ? 'error' : undefined"
                :error-message="targetError"
                @update:model-value="handleTargetChange"
              />
            </div>
            <Input
              v-else
              name="target"
              auto-complete="username"
              :model-value="target"
              placeholder="请输入邮箱或手机号"
              :status="targetError ? 'error' : undefined"
              :error-message="targetError"
              @update:model-value="handleTargetChange"
            />
          </FormItem>
          <div class="mb-4 min-w-0 space-y-2">
            <p class="p2-text-primary text-sm">验证码</p>
            <div class="flex min-w-0 flex-col gap-3">
              <div data-testid="auth-otp-input" class="flex min-w-0 w-full justify-start overflow-x-auto">
                <InputOTP
                  :model-value="code"
                  :length="OTP_LENGTH"
                  size="sm"
                  type="numeric"
                  aria-label="验证码"
                  :status="codeError ? 'error' : undefined"
                  :error-message="codeError"
                  @update:model-value="(val: string) => { code = val; codeError = '' }"
                />
              </div>
              <div class="flex items-center gap-3 min-h-8">
                <Button
                  v-if="canResend || !codeDeadline"
                  variant="outline"
                  size="sm"
                  :loading="codeLoading"
                  type="button"
                  @click="sendCode"
                >
                  获取验证码
                </Button>
                <Countdown
                  v-else
                  :value="codeDeadline"
                  format="s"
                  suffix="秒"
                  size="sm"
                  @finish="canResend = true"
                />
              </div>
            </div>
          </div>
          <p v-if="sentTo" class="p2-text-secondary mb-3 text-xs">验证账号：{{ sentTo }}</p>
          <p class="p2-text-secondary text-xs">演示验证码：{{ DEMO_OTP_CODE }}，随重置请求一起校验。</p>
          <div class="mt-8 flex flex-col gap-3">
            <Button variant="primary" block type="submit" :disabled="codeLoading">下一步</Button>
            <button type="button" class="text-center text-sm font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline" @click="goToLogin">返回登录</button>
          </div>
        </Form>

        <Form v-else-if="current === 1" :label-width="88" :loading="loading" @submit="submitPassword">
          <FormItem label="新密码">
            <Input
              name="password"
              auto-complete="new-password"
              :disabled="loading"
              :model-value="password"
              type="password"
              placeholder="请输入新密码"
              :status="passwordError ? 'error' : undefined"
              :error-message="passwordError"
              @update:model-value="(val: string) => { password = val; passwordError = '' }"
            />
          </FormItem>
          <FormItem label="确认密码">
            <Input
              name="confirmPassword"
              auto-complete="new-password"
              :disabled="loading"
              :model-value="confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              :status="confirmError ? 'error' : undefined"
              :error-message="confirmError"
              @update:model-value="(val: string) => { confirmPassword = val; confirmError = '' }"
            />
          </FormItem>
          <div class="mt-8 flex flex-col gap-3">
            <Button variant="primary" block :loading="loading" type="submit">重置密码</Button>
            <Button variant="outline" block type="button" @click="backToIdentity">上一步</Button>
          </div>
        </Form>

        <Result
          v-else
          status="success"
          title="密码已重置"
          sub-title="请使用新密码登录系统"
        >
          <div class="flex justify-center">
            <Button variant="primary" @click="goToLogin">返回登录</Button>
          </div>
        </Result>
      </Card>
    </div>
  </div>
</template>
