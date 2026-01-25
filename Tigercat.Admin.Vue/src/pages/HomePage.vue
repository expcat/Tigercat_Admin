<script setup lang="ts">
import { Alert, Card, Text } from '@expcat/tigercat-vue'

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

defineProps<{
  notice?: Notice;
  homeMessage?: string;
  homeError?: string;
}>()
</script>

<template>
  <div class="space-y-4">
    <Alert
      v-if="notice?.message"
      :type="notice.type"
      :title="notice.type === 'error' ? 'Operation Failed' : 'Success'"
      :description="notice.message"
      :closable="false"
    />

    <Card title="Dashboard">
      <Alert v-if="homeError" type="error" title="Load Failed" :description="homeError" :closable="false" />
      <Text v-else>{{ homeMessage || 'Welcome to Tigercat Admin' }}</Text>
    </Card>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
         <div class="text-slate-500 text-sm">Total Users</div>
         <div class="text-2xl font-bold mt-2">1,234</div>
      </Card>
      <Card>
         <div class="text-slate-500 text-sm">Active Sessions</div>
         <div class="text-2xl font-bold mt-2">56</div>
      </Card>
      <Card>
         <div class="text-slate-500 text-sm">System Status</div>
         <div class="text-2xl font-bold mt-2 text-green-500">Normal</div>
      </Card>
    </div>
  </div>
</template>
