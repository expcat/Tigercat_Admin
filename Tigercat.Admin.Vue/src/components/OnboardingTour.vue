<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { TourStep } from '@expcat/tigercat-core'
import { Tour } from '@expcat/tigercat-vue/Tour'

const TOUR_DONE_KEY = 'tigercat-admin:onboarding-tour:done'

const open = ref(false)
const current = ref(0)

const isMobile = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 767px)').matches

const steps: TourStep[] = [
  {
    title: '欢迎使用管理中心',
    description:
      '这是一个 Tigercat 组件示例后台。下面用几步带你认识全局功能。',
  },
  {
    target: '#main-sidebar',
    title: '导航侧栏',
    description: '在这里切换仪表盘、系统管理等各功能模块。',
    placement: 'right',
    skipWhen: () => isMobile(),
  },
  {
    target: '[aria-controls="main-sidebar"]',
    title: '折叠 / 展开侧栏',
    description: '点击可折叠侧栏；在移动端则用于打开导航抽屉。',
    placement: 'bottom',
  },
  {
    target: '[data-tour="notification-bell"]',
    title: '消息通知',
    description: '未读消息会在铃铛上提醒，可快速查看并一键全部已读。',
    placement: 'bottom',
  },
  {
    target: '[data-tour="chat-dock"]',
    title: '在线客服',
    description: '有问题可在右下角随时联系客服，对话在侧边抽屉中进行。',
    placement: 'left',
  },
  {
    title: '命令面板',
    description: '随时按 ⌘K / Ctrl+K 打开命令面板，快速跳转页面或执行操作。',
  },
]

const finishTour = () => {
  open.value = false
  try {
    localStorage.setItem(TOUR_DONE_KEY, '1')
  } catch {
    // 忽略隐私模式下的存储异常
  }
}

onMounted(() => {
  let done = false
  try {
    done = Boolean(localStorage.getItem(TOUR_DONE_KEY))
  } catch {
    done = false
  }
  if (!done) {
    window.setTimeout(() => {
      open.value = true
    }, 600)
  }
})
</script>

<template>
  <Tour
    v-model:open="open"
    v-model:current="current"
    :steps="steps"
    @close="finishTour"
    @finish="finishTour"
  />
</template>
