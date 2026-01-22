<script setup lang="ts">
import { Alert, Button, Card, Divider, Menu, Space, Text } from '@expcat/tigercat-vue'

interface Session {
  username: string;
}

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

const props = withDefaults(defineProps<{
  session?: Session | null;
  notice?: Notice;
  homeMessage?: string;
  homeError?: string;
  activeMenu?: string;
}>(), {
  session: null,
  notice: () => ({ type: '', message: '' }),
  homeMessage: '',
  homeError: '',
  activeMenu: 'home',
})

const emit = defineEmits<{
  (e: 'logout'): void;
  (e: 'open-change'): void;
  (e: 'select-menu', key: string): void;
}>()
</script>

<template>
  <div class="space-y-4">
    <Card>
      <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-3xl shadow-sm">
            🐯
          </div>
          <div class="flex flex-col">
            <Text size="lg" weight="bold">Tigercat Admin</Text>
            <span class="text-xs text-slate-400">Enterprise Control Panel</span>
          </div>
        </div>

        <div class="flex items-center gap-4 rounded-2xl bg-slate-50 p-2 border border-slate-100">
          <div class="flex items-center gap-2 px-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
            </span>
            <span class="text-sm font-semibold text-slate-700">{{ session?.username || 'Guest' }}</span>
          </div>
          
          <div class="h-6 w-px bg-slate-200"></div>

          <Space size="small">
            <Button
              variant="outline"
              size="small"
              class="!border-slate-200 !text-slate-600 hover:!bg-white hover:!text-blue-600"
              @click="emit('open-change')"
            >
              修改密码
            </Button>
            <Button 
              variant="outline" 
              size="small" 
              class="!border-red-100 !text-red-500 hover:!bg-red-50 hover:!border-red-200"
              @click="emit('logout')"
            >
              登出
            </Button>
          </Space>
        </div>
      </div>
    </Card>

    <Alert
      v-if="notice.message"
      :type="notice.type"
      :title="notice.type === 'error' ? '操作失败' : '操作成功'"
      :description="notice.message"
      :closable="false"
    />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
      <Card>
        <Text weight="bold">导航</Text>
        <Divider />
        <Menu
          :items="[{ key: 'home', label: '主页' }]"
          :active-key="activeMenu"
          @select="(key) => emit('select-menu', key)"
        />
      </Card>
      <Card title="主页">
        <Alert v-if="homeError" type="error" title="加载失败" :description="homeError" :closable="false" />
        <Text v-else>{{ homeMessage || '欢迎使用 Tigercat Admin' }}</Text>
      </Card>
    </div>
  </div>
</template>
