<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@expcat/tigercat-vue'
import { Result } from '@expcat/tigercat-vue/Result'
import { Countdown } from '@expcat/tigercat-vue/Countdown'
import { Empty } from '@expcat/tigercat-vue/Empty'

const props = defineProps<{
  status: 403 | 404 | 500
}>()

const router = useRouter()

const content = computed(() => {
  if (props.status === 403) {
    return {
      status: '403',
      title: '无权访问',
      subTitle: '当前账号没有访问该页面的权限，请联系管理员分配。',
    } as const
  }
  if (props.status === 404) {
    return {
      status: '404',
      title: '页面不存在',
      subTitle: '访问的地址不存在或已被移动。',
    } as const
  }
  return {
    status: '500',
    title: '服务异常',
    subTitle: '演示场景：会话异常或服务请求失败时，可跳转到此页查看统一兜底。',
  } as const
})

// Capture the countdown target once when the page is entered.
const countdownTarget = Date.now() + 5000
const autoJumpEnabled = ref(props.status === 404)
const canGoBack = computed(() => {
  const state = window.history.state as { back?: unknown; idx?: number; position?: number } | null
  if (state?.back != null) return true
  if (typeof state?.idx === 'number' && state.idx > 0) return true
  if (typeof state?.position === 'number' && state.position > 0) return true
  return window.history.length > 1
})

function goHome() {
  autoJumpEnabled.value = false
  router.push('/dashboard')
}

function goBack() {
  autoJumpEnabled.value = false
  if (canGoBack.value) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="min-h-screen bg-(--tiger-bg-page,#f8fafc) p-4 flex flex-col items-center justify-center">
    <div class="w-full max-w-md">
      <Result :status="content.status" :title="content.title" :sub-title="content.subTitle">
        <template #extra>
          <div class="flex justify-center gap-2">
            <Button @click="goHome">返回首页</Button>
            <Button variant="outline" @click="goBack">返回上一页</Button>
          </div>
        </template>
        <div class="flex flex-col items-center">
          <Countdown
            v-if="status === 404 && autoJumpEnabled"
            :value="countdownTarget"
            format="s"
            suffix="秒"
            title="即将自动返回首页"
            @finish="goHome"
          />
          <Empty
            v-if="!canGoBack"
            class="mt-4"
            description="没有可返回的历史记录"
            :show-image="false"
          />
        </div>
      </Result>
    </div>
  </div>
</template>
