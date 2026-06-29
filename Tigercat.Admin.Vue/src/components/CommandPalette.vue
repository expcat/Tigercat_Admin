<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { SpotlightItem } from '@expcat/tigercat-core'
import { Spotlight } from '@expcat/tigercat-vue/Spotlight'
import {
  SHELL_MENU_ITEMS,
  SHELL_BOTTOM_MENU_ITEMS,
  filterShellMenuItems,
  type ShellMenuItemDef,
} from '../utils/shell-navigation'
import { usePermission } from '../utils/permission'

const emit = defineEmits<{
  (e: 'toggle-theme'): void
  (e: 'change-password'): void
  (e: 'logout'): void
  (e: 'open-chat'): void
}>()

const router = useRouter()
const permission = usePermission()

const open = ref(false)
const query = ref('')

type CommandData =
  | { kind: 'route'; value: string }
  | { kind: 'action'; value: 'theme' | 'chat' | 'notifications' | 'password' | 'logout' }

const flattenRoutes = (items: ShellMenuItemDef[]): ShellMenuItemDef[] =>
  items.flatMap((item) =>
    item.children ? flattenRoutes(item.children) : item.routeName ? [item] : [],
  )

const navItems = computed<SpotlightItem[]>(() => {
  const permitted = filterShellMenuItems(
    [...SHELL_MENU_ITEMS, ...SHELL_BOTTOM_MENU_ITEMS],
    permission.has,
  )
  return flattenRoutes(permitted).map((item) => ({
    key: `route:${item.routeName}`,
    label: item.label,
    description: `跳转到${item.label}`,
    group: '页面导航',
    keywords: [item.label, item.routeName ?? ''],
    data: { kind: 'route', value: item.routeName } as CommandData,
  }))
})

const actionItems = computed<SpotlightItem[]>(() => [
  {
    key: 'action:theme',
    label: '切换主题模式',
    description: '在浅色 / 深色 / 跟随系统之间切换',
    group: '快捷操作',
    keywords: ['主题', '深色', '浅色', 'theme', 'dark'],
    data: { kind: 'action', value: 'theme' } as CommandData,
  },
  {
    key: 'action:chat',
    label: '打开在线客服',
    description: '在右侧抽屉中与客服对话',
    group: '快捷操作',
    keywords: ['客服', '聊天', 'chat', '对话'],
    data: { kind: 'action', value: 'chat' } as CommandData,
  },
  {
    key: 'action:notifications',
    label: '查看通知中心',
    description: '前往通知中心页面',
    group: '快捷操作',
    keywords: ['通知', '消息', 'notification'],
    data: { kind: 'action', value: 'notifications' } as CommandData,
  },
  {
    key: 'action:password',
    label: '修改密码',
    description: '打开修改密码对话框',
    group: '快捷操作',
    keywords: ['密码', 'password', '安全'],
    data: { kind: 'action', value: 'password' } as CommandData,
  },
  {
    key: 'action:logout',
    label: '退出登录',
    description: '安全退出当前账户',
    group: '快捷操作',
    keywords: ['退出', '登出', 'logout'],
    data: { kind: 'action', value: 'logout' } as CommandData,
  },
])

const items = computed<SpotlightItem[]>(() => [
  ...navItems.value,
  ...actionItems.value,
])

const handleSelect = (item: SpotlightItem) => {
  open.value = false
  const data = item.data as CommandData | undefined
  if (!data) {
    return
  }

  if (data.kind === 'route') {
    router.push({ name: data.value })
    return
  }

  switch (data.value) {
    case 'theme':
      emit('toggle-theme')
      break
    case 'chat':
      emit('open-chat')
      break
    case 'notifications':
      router.push({ name: 'notifications' })
      break
    case 'password':
      emit('change-password')
      break
    case 'logout':
      emit('logout')
      break
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    open.value = !open.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Spotlight
    v-model:open="open"
    v-model:query="query"
    :items="items"
    title="命令面板"
    placeholder="搜索页面或操作，按回车执行"
    empty-text="未找到匹配项"
    :close-on-select="true"
    @select="handleSelect"
  />
</template>
