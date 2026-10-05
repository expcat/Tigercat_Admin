<script setup lang="ts">
import { useRouter } from 'vue-router'
import { notification } from '@expcat/tigercat-vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Dropdown, DropdownItem, DropdownMenu } from '@expcat/tigercat-vue/Dropdown'
import { BackTop } from '@expcat/tigercat-vue/BackTop'
import Icon from './Icon.vue'

const router = useRouter()
const getScrollTarget = () =>
  (typeof document !== 'undefined'
    ? document.getElementById('main-content-scroll')
    : null)

const sendFeedback = () => {
  notification.info({
    title: '感谢你的反馈',
    description: '我们已收到你的反馈（演示场景，不会真实提交）。',
  })
}
</script>

<template>
  <Dropdown trigger="click" placement="bottom-end" :show-arrow="false">
    <template #trigger>
      <Button variant="ghost" aria-label="帮助与反馈" class="!hidden h-10 w-10 shrink-0 !p-0 sm:!flex">
        <Icon name="help" :size="20" />
      </Button>
    </template>
    <DropdownMenu>
      <DropdownItem @click="router.push('/help')">帮助中心</DropdownItem>
      <DropdownItem @click="sendFeedback">反馈</DropdownItem>
    </DropdownMenu>
  </Dropdown>
  <BackTop
    aria-label="回到顶部"
    :target="getScrollTarget"
    :visibility-height="240"
    position="fixed"
    placement="bottom-right"
    :offset="24"
  >
    <Icon name="arrowUp" :size="20" />
  </BackTop>
</template>
