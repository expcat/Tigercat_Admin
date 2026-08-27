<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Form, FormItem, Input, Message } from '@expcat/tigercat-vue'
import { Steps, StepsItem } from '@expcat/tigercat-vue/Steps'
import { Result } from '@expcat/tigercat-vue/Result'
import { Countdown } from '@expcat/tigercat-vue/Countdown'
import { InputOTP } from '@expcat/tigercat-vue/InputOTP'
import { MaskInput } from '@expcat/tigercat-vue/MaskInput'
import {
  apiRequest,
  detectForgotChannel,
  isPhoneIdentity,
  OTP_LENGTH,
  OTP_RESEND_MS,
  PHONE_MASK,
} from '../utils'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()
const current = ref(0)
const loading = ref(false)
const codeLoading = ref(false)
const target = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const sentTo = ref('')
const targetError = ref('')
const codeError = ref('')
const passwordError = ref('')
const confirmError = ref('')
const canResend = ref(true)
const codeDeadline = ref<number | null>(null)

const usePhoneMask = computed(() => isPhoneIdentity(target.value))
const channel = computed(() => detectForgotChannel(target.value.trim()))

function startResendCountdown() {
  canResend.value = false
  codeDeadline.value = Date.now() + OTP_RESEND_MS
}

function validateIdentity(): boolean {
  targetError.value = ''
  const value = target.value.trim()
  if (!value) {
    targetError.value = '请输入邮箱或手机号'
    return false
  }
  return true
}

function validateCodeInput(): boolean {
  codeError.value = ''
  if (!code.value.trim()) {
    codeError.value = '请输入验证码'
    return false
  }
  return true
}

function validatePasswords(): boolean {
  passwordError.value = ''
  confirmError.value = ''
  if (!password.value) {
    passwordError.value = '请输入新密码'
    return false
  }
  if (password.value.length < 6) {
    passwordError.value = '密码长度不能少于 6 位'
    return false
  }
  if (password.value !== confirmPassword.value) {
    confirmError.value = '两次输入的密码不一致'
    return false
  }
  return true
}

async function sendCode() {
  if (!validateIdentity()) return
  codeLoading.value = true
  try {
    const payload = await apiRequest<{ sentTo: string }>('/api/auth/forgot-password/code', {
      method: 'POST',
      body: JSON.stringify({
        channel: channel.value,
        target: target.value.trim(),
      }),
    })
    sentTo.value = payload.data?.sentTo || target.value.trim()
    startResendCountdown()
    Message.success({
      content: '验证码已发送至 ' + sentTo.value,
      duration: 2500,
    })
  } catch (error: any) {
    Message.error({
      content: error.message,
      duration: 3000,
    })
  } finally {
    codeLoading.value = false
  }
}

function submitIdentity() {
  if (!validateIdentity() || !validateCodeInput()) return
  if (!sentTo.value) {
    Message.warning({
      content: '请先获取验证码',
      duration: 2000,
    })
    return
  }
  current.value = 1
}

async function submitPassword() {
  if (!validatePasswords()) return
  loading.value = true
  try {
    await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        channel: channel.value,
        target: target.value.trim(),
        code: code.value.trim(),
        password: password.value,
      }),
    })
    current.value = 2
  } catch (error: any) {
    Message.error({
      content: error.message,
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push({ name: 'login' })
}
</script>

<template>
  <div
    class="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-(--tiger-border,#e2e8f0) dark:border-slate-850 bg-(--tiger-bg-card,#ffffff) dark:bg-slate-900/90 backdrop-blur-md animate-fade-in-up"
    style="--tiger-primary: #4f46e5; --tiger-primary-hover: #4338ca; --tiger-primary-disabled: #c7d2fe; --tiger-focus-ring: #4f46e5;"
  >
    <div class="hidden md:flex md:w-[42%] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 flex-col justify-between text-white relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow" />
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-8">
          <AppLogo :size="44" class="shadow-lg rounded-xl" />
          <span class="font-bold text-xl tracking-wider">Tigercat Admin</span>
        </div>
        <div class="space-y-6 my-auto pt-6">
          <h2 class="text-2xl font-bold leading-tight">找回账号访问权限</h2>
          <div class="space-y-4 text-indigo-100 text-sm">
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

      <Card variant="transparent" class="p-0 overflow-hidden">
        <div class="mb-6 overflow-x-auto">
          <Steps :current="current" size="small">
            <StepsItem title="验证身份" description="邮箱 / 手机号" />
            <StepsItem title="设置新密码" description="不少于 6 位" />
            <StepsItem title="完成" description="返回登录" />
          </Steps>
        </div>

        <Form v-if="current === 0" :label-width="88">
          <FormItem label="账号">
            <div v-if="usePhoneMask" data-testid="forgot-phone-mask">
              <MaskInput
                :model-value="target"
                :mask="PHONE_MASK"
                placeholder="请输入邮箱或手机号"
                :status="targetError ? 'error' : undefined"
                :error-message="targetError"
                @update:model-value="(val: string) => { target = val; targetError = '' }"
              />
            </div>
            <Input
              v-else
              :model-value="target"
              placeholder="请输入邮箱或手机号"
              :status="targetError ? 'error' : undefined"
              :error-message="targetError"
              @update:model-value="(val: string) => { target = val; targetError = '' }"
            />
          </FormItem>
          <FormItem label="验证码">
            <div class="flex flex-col gap-3">
              <div data-testid="auth-otp-input" class="flex justify-center sm:justify-start">
                <InputOTP
                  :model-value="code"
                  :length="OTP_LENGTH"
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
                  html-type="button"
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
          </FormItem>
          <div class="mt-8 flex flex-col gap-3">
            <Button variant="primary" block html-type="button" @click="submitIdentity">下一步</Button>
            <button type="button" class="text-center text-sm font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline" @click="goToLogin">返回登录</button>
          </div>
        </Form>

        <Form v-else-if="current === 1" :label-width="88">
          <FormItem label="新密码">
            <Input
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
              :model-value="confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              :status="confirmError ? 'error' : undefined"
              :error-message="confirmError"
              @update:model-value="(val: string) => { confirmPassword = val; confirmError = '' }"
            />
          </FormItem>
          <div class="mt-8 flex flex-col gap-3">
            <Button variant="primary" block :loading="loading" html-type="button" @click="submitPassword">重置密码</Button>
            <Button variant="outline" block html-type="button" @click="current = 0">上一步</Button>
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
