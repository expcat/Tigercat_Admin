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
  <Header class="flex items-center justify-between px-6 shadow-sm z-10">
    <div class="flex min-w-0 flex-col gap-1 py-3">
      <button
        v-if="props.showSidebarToggle"
        type="button"
        aria-controls="main-sidebar"
        :aria-expanded="props.sidebarOpen"
        :aria-label="props.sidebarOpen ? '关闭导航菜单' : '打开导航菜单'"
        class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--tiger-border,#e2e8f0)] text-[var(--tiger-text-secondary,#64748b)] transition-colors hover:border-[var(--tiger-primary,#3b82f6)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] md:hidden"
        @click="$emit('toggle-sidebar')"
      >
        <Icon :name="props.sidebarOpen ? 'x' : 'menu'" :size="18" />
      </button>
      <Text size="lg" weight="bold" class="text-[var(--tiger-text,#1f2937)]">管理中心</Text>
      <Breadcrumb class-name="text-sm text-[var(--tiger-text-secondary,#64748b)]">
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
    <div class="flex items-center gap-3">
      <Dropdown trigger="click" placement="bottom-end">
        <button 
          class="flex items-center gap-3 rounded-full border border-[var(--tiger-border,#e2e8f0)] bg-[var(--tiger-bg-hover,#f3f4f6)] px-3 py-1.5 text-left transition-colors hover:border-[var(--tiger-primary,#3b82f6)] hover:text-[var(--tiger-text,#1f2937)]"
          :title="getAccountLabel(props.session)"
          :aria-label="getAccountLabel(props.session)"
        >
          <Avatar class="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
            {{ getAccountLabel(props.session).charAt(0).toUpperCase() }}
          </Avatar>
          <span class="text-sm font-medium text-[var(--tiger-text,#1f2937)]">{{ getAccountLabel(props.session) }}</span>
        </button>

        <DropdownMenu class-name="min-w-56">
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
