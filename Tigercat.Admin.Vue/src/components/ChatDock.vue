<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { ChatMessage } from '@expcat/tigercat-core'
import { Badge, Drawer, Message } from '@expcat/tigercat-vue'
import { FloatButton } from '@expcat/tigercat-vue/FloatButton'
import { ChatWindow } from '@expcat/tigercat-vue/ChatWindow'
import { fetchChatMessages, sendChatMessage } from '../utils/chat'
import Icon from './Icon.vue'

const props = withDefaults(
  defineProps<{
    open?: boolean
  }>(),
  {
    open: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const messages = ref<ChatMessage[]>([])
const draft = ref('')
const unread = ref(1)
const loading = ref(false)

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const loadMessages = async () => {
  loading.value = true
  try {
    const payload = await fetchChatMessages()
    messages.value = (payload.data ?? []) as ChatMessage[]
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '客服消息加载失败'), duration: 3000 })
  } finally {
    loading.value = false
  }
}

const setOpen = (value: boolean) => {
  emit('update:open', value)
}

const toggle = () => {
  setOpen(!props.open)
}

const handleSend = async (value: string) => {
  const text = value.trim()
  if (!text) {
    return
  }

  try {
    const payload = await sendChatMessage(text)
    draft.value = ''
    messages.value = (payload.data ?? []) as ChatMessage[]
    if (!props.open) {
      unread.value += 1
    }
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '发送客服消息失败'), duration: 3000 })
  }
}

watch(
  () => props.open,
  (value) => {
    if (value) {
      unread.value = 0
    }
  },
)

onMounted(() => {
  void loadMessages()
})
</script>

<template>
  <div class="fixed bottom-6 right-6 z-40">
    <Badge
      :content="unread"
      :max="99"
      :show-zero="false"
      :standalone="false"
      variant="danger"
    >
      <FloatButton
        type="primary"
        size="lg"
        data-tour="chat-dock"
        :aria-label="props.open ? '关闭在线客服' : '联系在线客服'"
        :tooltip="props.open ? '关闭在线客服' : '联系在线客服'"
        @click="toggle"
      >
        <Icon :name="props.open ? 'x' : 'message'" :size="22" />
      </FloatButton>
    </Badge>
  </div>

  <Drawer
    placement="right"
    :open="props.open"
    title="在线客服"
    width="380px"
    :mask="true"
    :mask-closable="true"
    @update:open="setOpen"
    @close="setOpen(false)"
  >
    <ChatWindow
      v-model="draft"
      :messages="messages"
      placeholder="输入消息，回车发送"
      send-text="发送"
      :empty-text="loading ? '正在加载消息…' : '暂无消息，开始对话吧'"
      status-text="客服在线"
      status-variant="success"
      :show-time="true"
      :show-avatar="false"
      :show-name="false"
      @send="handleSend"
    />
  </Drawer>
</template>
