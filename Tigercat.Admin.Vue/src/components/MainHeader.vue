<script setup lang="ts">
import { computed, ref } from 'vue'
import { Avatar } from '@expcat/tigercat-vue/Avatar'
import { FullscreenButton } from '@expcat/tigercat-vue/FullscreenButton'
import { Message } from '@expcat/tigercat-vue/Message'
import {
  Breadcrumb,
  BreadcrumbItem,
} from '@expcat/tigercat-vue/Breadcrumb'
import { Button } from '@expcat/tigercat-vue/Button'
import {
  Dropdown,
  DropdownMenu,
  DropdownItem,
} from '@expcat/tigercat-vue/Dropdown'
import { Header } from '@expcat/tigercat-vue/Header'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import Icon from './Icon.vue'
import NotificationBell from './NotificationBell.vue'
import ThemeConfigDrawer from './ThemeConfigDrawer.vue'
import type { ThemeMode, ThemePreferences } from '../utils/types'
import { resolveEffectiveMode } from '../utils/theme'
import { usePermission } from '../utils/permission'

interface Session {
  username: string
}

const props = defineProps<{
  session: Session | null
  pageTitle: string
  breadcrumbItems: string[]
  themePrefs: ThemePreferences
  showSidebarToggle?: boolean
  sidebarOpen?: boolean
  demoMode?: boolean
}>()

defineEmits<{
  (e: 'logout'): void
  (e: 'change-password'): void
  (e: 'toggle-theme'): void
  (e: 'update-theme', prefs: ThemePreferences): void
  (e: 'toggle-sidebar'): void
  (e: 'profile'): void
  (e: 'lock-screen'): void
}>()

const themeDrawerOpen = ref(false)
const { has } = usePermission()
const themeMode = computed(() => props.themePrefs.mode)

function handleFullscreenError() {
  Message.error({ content: '全屏切换失败，请重试', duration: 3000 })
}

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
  <Header role="banner" height="auto" class="p2-main-header flex min-h-16 flex-nowrap items-center justify-between gap-2 px-3 py-2 z-10 sm:gap-3 sm:px-4 md:px-6">
    <div class="p2-header-title flex min-w-0 flex-1 items-center gap-3">
      <Button
        v-if="props.showSidebarToggle"
        variant="ghost"
        aria-controls="main-sidebar"
        :aria-expanded="props.sidebarOpen"
        :aria-label="props.sidebarOpen ? '关闭导航菜单' : '打开导航菜单'"
        class="p2-header-toggle-btn h-10 w-10 !p-0 shrink-0"
        @click="$emit('toggle-sidebar')"
      >
        <Icon name="menu" :size="18" />
      </Button>
      <Text size="sm" weight="medium" class="min-w-0 truncate lg:hidden">{{ props.pageTitle }}</Text>
      <Breadcrumb class-name="hidden min-w-0 max-w-full overflow-hidden text-sm text-(--tiger-text-secondary,#64748b) lg:block" :max-items="3">
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
    <div class="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <Tag
        v-if="props.demoMode"
        variant="warning"
        class="!hidden xl:!inline-flex"
      >
        演示模式
      </Tag>
      <FullscreenButton
        data-testid="shell-fullscreen-toggle"
        :labels="{ enterAriaLabel: '进入全屏', exitAriaLabel: '退出全屏' }"
        class="!hidden h-10 w-10 shrink-0 lg:!inline-flex"
        @error="handleFullscreenError"
      />
      <button
        type="button"
        data-testid="shell-theme-config-trigger"
        aria-label="主题配置"
        title="主题配置"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-(--tiger-text,#1f2937) transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
        :class="{ 'bg-(--tiger-bg-hover,#f1f5f9)': themeDrawerOpen }"
        @click="themeDrawerOpen = true"
      >
        <Icon name="palette" :size="20" />
      </button>
      <slot name="chat-dock" />
      <NotificationBell v-if="has('notification:view')" />
      <Dropdown trigger="click" placement="bottom-end" :show-arrow="false">
        <template #trigger="{ open }">
          <button
            class="p2-header-user-btn"
            :title="getAccountLabel(props.session)"
            :aria-label="getAccountLabel(props.session)"
          >
            <Avatar class="p2-avatar shrink-0 font-medium text-sm bg-(--tiger-primary) text-(--tiger-primary-foreground)">
              {{ getAccountLabel(props.session).charAt(0).toUpperCase() }}
            </Avatar>
            <span class="p2-header-user-name hidden min-w-0 truncate text-sm font-medium text-(--tiger-text,#1f2937) xl:inline">{{ getAccountLabel(props.session) }}</span>
            <Icon
              name="chevronDown"
              :size="14"
              class="p2-header-chevron hidden shrink-0 xl:block"
              :class="{ 'rotate-180': open }"
            />
          </button>
        </template>

        <DropdownMenu class-name="w-56 max-w-[calc(100vw-2rem)]">
          <DropdownItem @click="$emit('profile')">
            <span class="flex items-center gap-2 text-sm">
              <Icon name="user" :size="16" />
              <span>个人中心</span>
            </span>
          </DropdownItem>
          <DropdownItem divided @click="$emit('toggle-theme')">
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
          <DropdownItem @click="$emit('lock-screen')">
            <span class="flex items-center gap-2 text-sm">
              <Icon name="lock" :size="16" />
              <span>锁定屏幕</span>
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
    <ThemeConfigDrawer
      :open="themeDrawerOpen"
      :theme-prefs="props.themePrefs"
      @update:open="(value: boolean) => (themeDrawerOpen = value)"
      @close="themeDrawerOpen = false"
      @update-theme="$emit('update-theme', $event)"
    />
  </Header>
</template>
