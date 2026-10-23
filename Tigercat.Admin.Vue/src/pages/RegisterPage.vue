<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Input } from '@expcat/tigercat-vue/Input'
import { Message } from '@expcat/tigercat-vue/Message'
import { useAuthForm, apiRequest } from '../utils'
import type { FormRules } from '@expcat/tigercat-core'
import AppLogo from '../components/AppLogo.vue'

interface RegisterResult {
  username: string;
}

const router = useRouter()
const route = useRoute()
let request: AbortController | null = null
onBeforeUnmount(() => request?.abort())
const authRules: FormRules = {
  username: { required: true, transform: (value) => String(value ?? '').trim(), message: '请输入用户名' },
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度不能少于 6 位' },
  ],
}

const { form, setField } = useAuthForm({ username: '', password: '' })
const loading = ref(false)

async function handleRegister() {
  if (request) return
  const controller = new AbortController()
  request = controller
  loading.value = true
  try {
    const payload = await apiRequest<RegisterResult>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...form.value, username: form.value.username?.trim() }),
      signal: controller.signal,
    })
    if (controller.signal.aborted) return
    if (!payload?.data?.username) throw new Error('注册响应不完整，请重试')
    router.replace({ name: 'register-success', query: route.query })
  } catch (error: unknown) {
    if (!controller.signal.aborted) Message.error({ content: error instanceof Error ? error.message : '注册失败，请重试', duration: 3000 })
  } finally {
    if (!controller.signal.aborted) {
      request = null
      loading.value = false
    }
  }
}

const goToLogin = () => {
  router.push({ name: 'login', query: route.query })
}
</script>

<template>
  <div
    class="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-lg border border-(--tiger-border,#e2e8f0)/30 bg-(--tiger-surface) animate-fade-in-up motion-reduce:animate-none"
    style="--tiger-primary: #7c3aed; --tiger-primary-hover: #6d28d9; --tiger-primary-disabled: #ddd6fe; --tiger-focus-ring: #7c3aed;"
  >
    <!-- Left side: branding/decoration -->
    <div class="hidden md:flex md:w-[42%] bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600 p-8 flex-col justify-between text-white relative overflow-hidden">
      <!-- Glow blobs -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
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
          <div class="space-y-4 text-pretty text-pink-100 text-sm">
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

      <Card variant="transparent" class="p-0">
        <Form :model-value="form" :rules="authRules" :label-width="88" :loading="loading" @submit="({ valid }) => { if (valid) handleRegister() }">
          <FormItem name="username" label="用户名">
            <Input
              :model-value="form.username"
              placeholder="请输入用户名"
              auto-complete="username"
              :disabled="loading"
              @update:model-value="(val) => setField('username', val)"
            />
          </FormItem>
          <FormItem name="password" label="密码">
            <Input
              :model-value="form.password"
              type="password"
              placeholder="请输入密码"
              auto-complete="new-password"
              :disabled="loading"
              @update:model-value="(val) => setField('password', val)"
            />
          </FormItem>
          <div class="mt-8 flex flex-col gap-3">
            <Button
              variant="primary"
              block
              :loading="loading"
              type="submit"
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
