<script setup lang="ts">
import { useRouter } from 'vue-router'
import { notification } from '@expcat/tigercat-vue'
import { FloatButton, FloatButtonGroup } from '@expcat/tigercat-vue/FloatButton'
import { BackTop } from '@expcat/tigercat-vue/BackTop'
import Icon from './Icon.vue'

const router = useRouter()

const getScrollTarget = () =>
  (typeof document !== 'undefined'
    ? document.getElementById('main-content-scroll')
    : null)

const goHelp = () => {
  router.push({ name: 'about' })
}

const sendFeedback = () => {
  notification.info({
    title: '感谢你的反馈',
    description: '我们已收到你的反馈（演示场景，不会真实提交）。',
  })
}
</script>

<template>
  <FloatButtonGroup trigger="click" :style="{ bottom: '6.5rem' }">
    <template #trigger>
      <FloatButton type="primary" size="lg" aria-label="快捷操作" tooltip="快捷操作">
        <Icon name="plus" :size="22" />
      </FloatButton>
    </template>
    <FloatButton
      type="default"
      size="md"
      aria-label="帮助"
      tooltip="帮助"
      @click="goHelp"
    >
      <Icon name="help" :size="20" />
    </FloatButton>
    <FloatButton
      type="default"
      size="md"
      aria-label="反馈"
      tooltip="反馈"
      @click="sendFeedback"
    >
      <Icon name="message" :size="20" />
    </FloatButton>
  </FloatButtonGroup>

  <BackTop
    :target="getScrollTarget"
    :visibility-height="240"
    class="!fixed !bottom-6 !left-6 !right-auto !ml-0 !mr-0"
  >
    <Icon name="arrowUp" :size="20" />
  </BackTop>
</template>
