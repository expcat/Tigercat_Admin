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
  <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 transition-colors">
    <div class="flex items-center">
      <Text size="lg" weight="bold">Admin Portal</Text>
    </div>
    
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2" v-if="session">
        <Avatar class="bg-blue-100 text-blue-600 font-bold">
          {{ session.username.charAt(0).toUpperCase() }}
        </Avatar>
        <div class="flex flex-col">
          <span class="text-sm font-medium">{{ session.username }}</span>
        </div>
      </div>
      
      <div class="h-6 w-px bg-slate-200 mx-2"></div>
      
      <button @click="$emit('change-password')" class="text-sm text-slate-600 hover:text-blue-600 cursor-pointer">
        Password
      </button>
      <button @click="$emit('logout')" class="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer">
        Logout
      </button>
    </div>
  </header>
</template>
