<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Avatar } from '@expcat/tigercat-vue/Avatar'
import { Icon as TigerIcon } from '@expcat/tigercat-vue/Icon'
import type { IconDefinition } from '@expcat/tigercat-core/icons/registry'
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
import {
  isDocumentFullscreen,
  toggleDocumentFullscreen,
} from '../utils/fullscreen'

const ENTER_FULLSCREEN_ICON: IconDefinition = {
  viewBox: '0 0 24 24',
  mode: 'stroke',
  paths: [
    'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15',
  ],
}

const EXIT_FULLSCREEN_ICON: IconDefinition = {
  viewBox: '0 0 24 24',
  mode: 'stroke',
  paths: [
    'M9 9 3.75 3.75M9 9H4.5M9 9V4.5M15 9l5.25-5.25M15 9h4.5M15 9V4.5M9 15l-5.25 5.25M9 15H4.5M9 15v4.5M15 15l5.25 5.25M15 15h4.5M15 15v4.5',
  ],
}

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
const fullscreen = ref(false)
const themeMode = computed(() => props.themePrefs.mode)
const fullscreenIcon = computed(() =>
  fullscreen.value ? EXIT_FULLSCREEN_ICON : ENTER_FULLSCREEN_ICON,
)

function syncFullscreen() {
  fullscreen.value = isDocumentFullscreen()
}

function handleToggleFullscreen() {
  void toggleDocumentFullscreen().catch(() => undefined)
}

onMounted(() => {
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreen)
})

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
      <button
        type="button"
        data-testid="shell-fullscreen-toggle"
        :aria-label="fullscreen ? '退出全屏' : '进入全屏'"
        :title="fullscreen ? '退出全屏' : '进入全屏'"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-(--tiger-text,#1f2937) transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
        @click="handleToggleFullscreen"
      >
        <TigerIcon :icon="fullscreenIcon" size="md" />
      </button>
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
      <NotificationBell />
      <Dropdown trigger="click" placement="bottom-end" :show-arrow="false">
        <template #trigger="{ open }">
          <button
            class="p2-header-user-btn"
            :title="getAccountLabel(props.session)"
            :aria-label="getAccountLabel(props.session)"
          >
            <Avatar class="p2-avatar shrink-0 font-bold text-sm bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white">
              {{ getAccountLabel(props.session).charAt(0).toUpperCase() }}
            </Avatar>
            <span class="min-w-0 truncate text-sm font-medium text-(--tiger-text,#1f2937)">{{ getAccountLabel(props.session) }}</span>
            <Icon
              name="chevronDown"
              :size="14"
              class="p2-header-chevron shrink-0"
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
