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
  Button,
  Tag,
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
  <Header height="auto" class="p2-main-header flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 z-10 md:flex-nowrap md:px-6">
    <div class="flex min-w-0 flex-1 flex-col gap-1 py-2">
      <div class="flex items-center gap-2">
        <Button
          v-if="props.showSidebarToggle"
          variant="outline"
          aria-controls="main-sidebar"
          :aria-expanded="props.sidebarOpen"
          :aria-label="props.sidebarOpen ? '关闭导航菜单' : '打开导航菜单'"
          class="p2-header-toggle-btn h-10 w-10 !p-0 shrink-0"
          @click="$emit('toggle-sidebar')"
        >
          <Icon :name="props.sidebarOpen ? 'x' : 'menu'" :size="18" />
        </Button>
        <Text size="lg" weight="bold" class="p2-header-title">管理中心</Text>
      </div>
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
      <Tag
        v-if="props.demoMode"
        variant="warning"
        class="p2-header-demo-tag rounded-full px-3 font-medium"
      >
        演示模式
      </Tag>
      <Dropdown trigger="click" placement="bottom-end" :show-arrow="false">
        <button 
          class="p2-header-user-btn"
          :title="getAccountLabel(props.session)"
          :aria-label="getAccountLabel(props.session)"
        >
          <Avatar class="p2-avatar shrink-0 font-bold text-sm bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white">
            {{ getAccountLabel(props.session).charAt(0).toUpperCase() }}
          </Avatar>
          <span class="min-w-0 truncate text-sm font-medium text-(--tiger-text,#1f2937)">{{ getAccountLabel(props.session) }}</span>
          <Icon name="chevronDown" :size="14" class="p2-header-chevron shrink-0" />
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
