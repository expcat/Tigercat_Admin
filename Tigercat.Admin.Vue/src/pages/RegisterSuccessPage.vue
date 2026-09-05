<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Result } from '@expcat/tigercat-vue/Result'
import { Countdown } from '@expcat/tigercat-vue/Countdown'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()
const countdownTarget = Date.now() + 5000
const autoJumpEnabled = ref(true)

function goToLogin() {
  autoJumpEnabled.value = false
  router.push({ name: 'login' })
}
</script>

<template>
  <div
    class="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-(--tiger-border,#e2e8f0) dark:border-slate-850 bg-(--tiger-bg-card,#ffffff) dark:bg-slate-900/90 backdrop-blur-md animate-fade-in-up"
    style="--tiger-primary: #7c3aed; --tiger-primary-hover: #6d28d9; --tiger-primary-disabled: #ddd6fe; --tiger-focus-ring: #7c3aed;"
  >
    <div class="hidden md:flex md:w-[42%] bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600 p-8 flex-col justify-between text-white relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow" />
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-8">
          <AppLogo :size="44" class="shadow-lg rounded-xl" />
          <span class="font-bold text-xl tracking-wider">Tigercat Admin</span>
        </div>
        <div class="space-y-6 my-auto pt-6">
          <h2 class="text-2xl font-bold leading-tight">账号已创建成功</h2>
          <p class="text-pink-100 text-sm">即将返回登录页，使用新账号继续访问系统。</p>
        </div>
      </div>
      <div class="relative z-10 text-xs text-pink-200/80">
        © 2026 Tigercat Team. All rights reserved.
      </div>
    </div>

    <div class="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center">
      <div class="md:hidden flex items-center justify-center gap-3 mb-6">
        <AppLogo :size="48" class="shadow-md rounded-xl" />
        <h2 class="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
      </div>
      <Card variant="transparent" class="p-0">
      <Result status="success" title="注册成功" sub-title="账号已创建，即将返回登录页">
        <div v-if="autoJumpEnabled" class="mb-4 flex justify-center">
          <Countdown
            :value="countdownTarget"
            format="s"
            suffix="秒"
            title="即将自动返回登录"
            @finish="goToLogin"
          />
        </div>
        <div class="flex justify-center">
          <Button variant="primary" @click="goToLogin">立即登录</Button>
        </div>
      </Result>
      </Card>
    </div>
  </div>
</template>
