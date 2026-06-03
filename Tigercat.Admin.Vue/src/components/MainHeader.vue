<script setup lang="ts">
import {
  Text,
  Avatar,
  Header,
  Breadcrumb,
  BreadcrumbItem,
  Dropdown,
  DropdownMenu,
  DropdownItem,
} from '@expcat/tigercat-vue'
import Icon from './Icon.vue'
import type { ThemeMode } from '../utils/types'
import { resolveEffectiveMode } from '../utils/theme'

interface Session {
  username: string
}

const props = defineProps<{
  session: Session | null
  pageTitle: string
  breadcrumbItems: string[]
  themeMode: ThemeMode
  showSidebarToggle?: boolean
  sidebarOpen?: boolean
  demoMode?: boolean
}>()

defineEmits<{
  (e: 'logout'): void
  (e: 'change-password'): void
  (e: 'toggle-theme'): void
  (e: 'toggle-sidebar'): void
}>()

function getThemeIcon(mode: ThemeMode): string {
  if (mode === 'system') return 'monitor'
  return resolveEffectiveMode(mode) === 'dark' ? 'moon' : 'sun'
}

function getThemeLabel(mode: ThemeMode): string {
  if (mode === 'light') return '浅色'
  if (mode === 'dark') return '深色'
  return '跟随系统'
}

function getAccountLabel(session: Session | null): string {
  return session?.username ?? '账户'
}

function isCurrentBreadcrumb(index: number, items: string[]): boolean {
  return index === items.length - 1
}
</script>

<template>
  <Header class="flex flex-wrap items-center justify-between gap-3 px-4 py-2 shadow-sm z-10 md:flex-nowrap md:px-6">
    <div class="flex min-w-0 flex-1 flex-col gap-1 py-2">
      <button
        v-if="props.showSidebarToggle"
        type="button"
        aria-controls="main-sidebar"
        :aria-expanded="props.sidebarOpen"
        :aria-label="props.sidebarOpen ? '关闭导航菜单' : '打开导航菜单'"
        class="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-(--tiger-border,#e2e8f0) text-(--tiger-text-secondary,#64748b) transition-colors hover:border-(--tiger-primary,#3b82f6) hover:bg-(--tiger-bg-hover,#f3f4f6) hover:text-(--tiger-text,#1f2937) md:hidden"
        @click="$emit('toggle-sidebar')"
      >
        <Icon :name="props.sidebarOpen ? 'x' : 'menu'" :size="18" />
      </button>
      <Text size="lg" weight="bold" class="text-(--tiger-text,#1f2937)">管理中心</Text>
      <Breadcrumb class-name="min-w-0 max-w-full overflow-hidden text-sm text-(--tiger-text-secondary,#64748b)" :max-items="4">
        <BreadcrumbItem>管理中心</BreadcrumbItem>
        <BreadcrumbItem
          v-for="(item, index) in (props.breadcrumbItems.length ? props.breadcrumbItems : [props.pageTitle])"
          :key="`${item}-${index}`"
          :current="isCurrentBreadcrumb(index, props.breadcrumbItems.length ? props.breadcrumbItems : [props.pageTitle])"
        >
          {{ item }}
        </BreadcrumbItem>
      </Breadcrumb>
    </div>
    
    <!-- 右侧操作区 -->
    <div class="flex min-w-0 max-w-full shrink-0 items-center gap-2 sm:gap-3">
      <span
        v-if="props.demoMode"
        class="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700"
      >
        演示模式
      </span>
      <Dropdown trigger="click" placement="bottom-end">
        <button 
          class="flex max-w-[12rem] items-center gap-2 rounded-full border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-hover,#f3f4f6) px-2.5 py-1.5 text-left transition-colors hover:border-(--tiger-primary,#3b82f6) hover:text-(--tiger-text,#1f2937) sm:max-w-56 sm:gap-3 sm:px-3"
          :title="getAccountLabel(props.session)"
          :aria-label="getAccountLabel(props.session)"
        >
          <Avatar class="p2-icon-chip shrink-0 font-bold text-sm">
            {{ getAccountLabel(props.session).charAt(0).toUpperCase() }}
          </Avatar>
          <span class="min-w-0 truncate text-sm font-medium text-(--tiger-text,#1f2937)">{{ getAccountLabel(props.session) }}</span>
        </button>

        <DropdownMenu class-name="w-56 max-w-[calc(100vw-2rem)]">
          <DropdownItem @click="$emit('toggle-theme')">
            <span class="flex items-center gap-2 text-sm">
              <Icon :name="getThemeIcon(themeMode)" :size="16" />
              <span>主题模式：{{ getThemeLabel(themeMode) }}</span>
            </span>
          </DropdownItem>
          <DropdownItem @click="$emit('change-password')">
            <span class="flex items-center gap-2 text-sm">
              <Icon name="lock" :size="16" />
              <span>修改密码</span>
            </span>
          </DropdownItem>
          <DropdownItem divided @click="$emit('logout')">
            <span class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Icon name="logout" :size="16" />
              <span>退出登录</span>
            </span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  </Header>
</template>
