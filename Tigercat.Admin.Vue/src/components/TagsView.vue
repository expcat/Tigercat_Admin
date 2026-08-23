<script setup lang="ts">
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  Tag,
} from '@expcat/tigercat-vue'
import Icon from './Icon.vue'
import {
  getShellPageTitle,
  type ShellPageKey,
} from '../utils/shell-navigation'
import { TAGS_VIEW_HOME_KEY } from '../utils/tags-view'
import { computed } from 'vue'

const props = defineProps<{
  keys: ShellPageKey[]
  activeKey: ShellPageKey
}>()

const emit = defineEmits<{
  (e: 'select', key: ShellPageKey): void
  (e: 'close', key: ShellPageKey): void
  (e: 'close-current'): void
  (e: 'close-others'): void
  (e: 'close-all'): void
}>()

const canCloseCurrent = computed(() => props.activeKey !== TAGS_VIEW_HOME_KEY)
const canCloseOthers = computed(() =>
  props.keys.some((key) => key !== TAGS_VIEW_HOME_KEY && key !== props.activeKey),
)
const canCloseAll = computed(() =>
  props.keys.some((key) => key !== TAGS_VIEW_HOME_KEY),
)

function tabTitle(key: ShellPageKey): string {
  return getShellPageTitle(key)
}

function handleClose(event: Event | undefined, key: ShellPageKey) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  emit('close', key)
}

function handleSelect(event: MouseEvent, key: ShellPageKey) {
  if ((event.target as HTMLElement).closest('button')) {
    return
  }
  emit('select', key)
}
</script>

<template>
  <div
    data-testid="shell-tags-view"
    class="p2-tags-view flex min-w-0 w-full shrink-0 items-center gap-1 border-b border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#ffffff) px-3 py-1.5 md:px-6"
  >
    <div
      role="tablist"
      aria-label="已打开的页面"
      class="p2-tags-view-list flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain"
    >
      <span
        v-for="key in props.keys"
        :key="key"
        :data-testid="`shell-tag-${key}`"
        :data-active="key === props.activeKey ? 'true' : 'false'"
        role="tab"
        tabindex="0"
        :aria-selected="key === props.activeKey"
        :title="tabTitle(key)"
        class="shrink-0 cursor-pointer"
        @click="handleSelect($event, key)"
        @keydown.enter.prevent="emit('select', key)"
        @keydown.space.prevent="emit('select', key)"
      >
        <Tag
          :variant="key === props.activeKey ? 'primary' : 'default'"
          size="sm"
          :closable="key !== TAGS_VIEW_HOME_KEY"
          :close-aria-label="`关闭${tabTitle(key)}`"
          class-name="whitespace-nowrap"
          @close="handleClose($event, key)"
        >
          {{ tabTitle(key) }}
        </Tag>
      </span>
    </div>
    <Dropdown trigger="click" placement="bottom-end" :show-arrow="false">
      <template #trigger>
        <Button
          variant="ghost"
          size="sm"
          aria-label="标签操作"
          data-testid="shell-tags-view-actions"
          class="h-8 w-8 !p-0 shrink-0"
        >
          <Icon name="moreHorizontal" :size="16" />
        </Button>
      </template>
      <DropdownMenu class-name="w-40 max-w-[calc(100vw-2rem)]">
        <DropdownItem :disabled="!canCloseCurrent" @click="emit('close-current')">
          关闭当前
        </DropdownItem>
        <DropdownItem :disabled="!canCloseOthers" @click="emit('close-others')">
          关闭其他
        </DropdownItem>
        <DropdownItem :disabled="!canCloseAll" @click="emit('close-all')">
          关闭全部
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  </div>
</template>
