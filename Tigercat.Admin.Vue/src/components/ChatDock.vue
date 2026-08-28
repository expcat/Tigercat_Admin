<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { ChatMessage } from '@expcat/tigercat-core'
import { Badge, Drawer, Message } from '@expcat/tigercat-vue'
import { FloatButton } from '@expcat/tigercat-vue/FloatButton'
import { ChatWindow } from '@expcat/tigercat-vue/ChatWindow'
import { fetchChatMessages, sendChatMessage } from '../utils/chat'
import { formatDisplayDateTime } from '../utils/common'
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

function mapChatMessages(items: ChatMessage[] | undefined): ChatMessage[] {
  return (items ?? []).map((item) => ({
    ...item,
    content: String(item.content ?? '').replaceAll('客服坞', '客服回复'),
    time: formatDisplayDateTime(item.time),
  }))
}

const loadMessages = async () => {
  loading.value = true
  try {
    const payload = await fetchChatMessages()
    messages.value = mapChatMessages(payload.data as ChatMessage[] | undefined)
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
    messages.value = mapChatMessages(payload.data as ChatMessage[] | undefined)
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
  <FloatButton
    floating
    placement="bottom-right"
    :offset="24"
    type="primary"
    size="lg"
    data-tour="chat-dock"
    :aria-label="props.open ? '关闭在线客服' : '联系在线客服'"
    :tooltip="props.open ? '关闭在线客服' : '联系在线客服'"
    @click="toggle"
  >
    <Icon :name="props.open ? 'x' : 'message'" :size="22" />
    <Badge
      :content="unread"
      :max="99"
      :show-zero="false"
      standalone
      variant="danger"
      class="pointer-events-none absolute -right-1 -top-1"
    />
  </FloatButton>

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
      class="h-full min-h-0 [&_textarea]:resize-none"
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
