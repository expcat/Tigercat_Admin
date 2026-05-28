<script setup lang="ts">
import { Text, Avatar, Header, Breadcrumb, BreadcrumbItem } from '@expcat/tigercat-vue'
import Icon from './Icon.vue'
import type { ThemeMode } from '../utils/types'
import { resolveEffectiveMode } from '../utils/theme'

interface Session {
  username: string
}

defineProps<{
  session: Session | null
  pageTitle: string
  themeMode: ThemeMode
}>()

defineEmits<{
  (e: 'logout'): void
  (e: 'change-password'): void
  (e: 'toggle-theme'): void
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
</script>

<template>
  <Header class="flex items-center justify-between px-6 shadow-sm z-10">
    <div class="flex min-w-0 flex-col gap-1 py-3">
      <Text size="lg" weight="bold" class="text-[var(--tiger-text,#1f2937)]">管理中心</Text>
      <Breadcrumb class-name="text-sm text-[var(--tiger-text-secondary,#64748b)]">
        <BreadcrumbItem>管理中心</BreadcrumbItem>
        <BreadcrumbItem current>{{ pageTitle }}</BreadcrumbItem>
      </Breadcrumb>
    </div>
    
    <!-- 右侧操作区 -->
    <div class="flex items-center gap-3">
      <!-- 主题切换 -->
      <button 
        @click="$emit('toggle-theme')" 
        class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] transition-colors"
        :title="getThemeLabel(themeMode)"
        :aria-label="getThemeLabel(themeMode)"
      >
        <Icon :name="getThemeIcon(themeMode)" :size="16" />
      </button>

      <!-- 用户信息 -->
      <div v-if="session" class="flex items-center gap-3 px-3 py-1.5 rounded-full bg-[var(--tiger-bg-hover,#f3f4f6)] border border-[var(--tiger-border,#e2e8f0)]">
        <Avatar class="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
          {{ session.username.charAt(0).toUpperCase() }}
        </Avatar>
        <span class="text-sm font-medium text-[var(--tiger-text,#1f2937)]">{{ session.username }}</span>
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex items-center gap-1">
        <button 
          @click="$emit('change-password')" 
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] transition-colors"
        >
          <Icon name="lock" :size="16" />
          <span>修改密码</span>
        </button>
        <button 
          @click="$emit('logout')" 
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-colors dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
        >
          <Icon name="logout" :size="16" />
          <span>退出</span>
        </button>
      </div>
    </div>
  </Header>
</template>
