<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChatMessage } from '@expcat/tigercat-core'
import { Badge, Drawer } from '@expcat/tigercat-vue'
import { FloatButton } from '@expcat/tigercat-vue/FloatButton'
import { ChatWindow } from '@expcat/tigercat-vue/ChatWindow'
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

let messageSeq = 0
const nextId = () => `chat-${Date.now()}-${messageSeq++}`

const messages = ref<ChatMessage[]>([
  {
    id: nextId(),
    content: '你好，我是在线客服小虎，有任何关于后台的问题都可以问我～',
    direction: 'other',
    time: new Date().toISOString(),
  },
])
const draft = ref('')
const unread = ref(1)

const setOpen = (value: boolean) => {
  emit('update:open', value)
}

const toggle = () => {
  setOpen(!props.open)
}

const buildReply = (input: string) =>
  `已收到你的消息：“${input}”。这是演示客服坞，稍后会有同事跟进（ChatWindow 组件示例）。`

const handleSend = (value: string) => {
  const text = value.trim()
  if (!text) {
    return
  }

  messages.value = [
    ...messages.value,
    {
      id: nextId(),
      content: text,
      direction: 'self',
      time: new Date().toISOString(),
    },
  ]
  draft.value = ''

  window.setTimeout(() => {
    messages.value = [
      ...messages.value,
      {
        id: nextId(),
        content: buildReply(text),
        direction: 'other',
        time: new Date().toISOString(),
      },
    ]
    if (!props.open) {
      unread.value += 1
    }
  }, 700)
}

watch(
  () => props.open,
  (value) => {
    if (value) {
      unread.value = 0
    }
  },
)
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
      empty-text="暂无消息，开始对话吧"
      status-text="客服在线"
      status-variant="success"
      :show-time="true"
      :show-avatar="false"
      :show-name="false"
      @send="handleSend"
    />
  </Drawer>
</template>
