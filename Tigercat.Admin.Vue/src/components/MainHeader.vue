<script setup lang="ts">
import { Text, Avatar } from '@expcat/tigercat-vue'

interface Session {
  username: string
}

defineProps<{
  session: Session | null
}>()

defineEmits<{
  (e: 'logout'): void
  (e: 'change-password'): void
}>()
</script>

<template>
  <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
    <!-- 左侧标题 -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xl">🏠</span>
        <Text size="lg" weight="bold" class="text-slate-800">管理中心</Text>
      </div>
    </div>
    
    <!-- 右侧操作区 -->
    <div class="flex items-center gap-3">
      <!-- 用户信息 -->
      <div v-if="session" class="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
        <Avatar class="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
          {{ session.username.charAt(0).toUpperCase() }}
        </Avatar>
        <span class="text-sm font-medium text-slate-700">{{ session.username }}</span>
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex items-center gap-1">
        <button 
          @click="$emit('change-password')" 
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <span>🔒</span>
          <span>修改密码</span>
        </button>
        <button 
          @click="$emit('logout')" 
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-colors"
        >
          <span>🚪</span>
          <span>退出</span>
        </button>
      </div>
    </div>
  </header>
</template>
