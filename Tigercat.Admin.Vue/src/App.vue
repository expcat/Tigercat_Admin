<script setup>
import { ref, onMounted } from 'vue'
import { Button, Card, Alert } from '@expcat/tigercat-vue'

const hiMessage = ref(null)
const error = ref(null)

onMounted(async () => {
  try {
    const hiResponse = await fetch('/api/hi')
    hiMessage.value = await hiResponse.json()
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold text-white mb-2">🐯 Tigercat Admin</h1>
        <p class="text-xl text-white/90">Vue3 Implementation</p>
      </div>

      <Card title="欢迎使用 Tigercat Admin" class="mb-6">
        <p class="text-gray-600 mb-4">这是基于 Vue3 + Vite + Tigercat UI 的管理后台基础结构</p>
        
        <div class="grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div>前端框架: Vue 3</div>
          <div>构建工具: Vite</div>
          <div>包管理器: PNPM</div>
          <div>UI 组件: Tigercat UI</div>
        </div>
      </Card>

      <Alert v-if="hiMessage" type="success" class="mb-6" :closable="false">
        <template #title>API 连接成功</template>
        <p class="text-lg font-semibold">{{ hiMessage }}</p>
      </Alert>

      <Alert v-if="error" type="error" class="mb-6">
        <template #title>API 连接失败</template>
        {{ error }}
      </Alert>

      <Card title="快速开始" class="mb-6">
        <div class="space-y-2 text-gray-700">
          <p>✨ 集成 Tigercat UI 组件库</p>
          <p>🚀 添加路由配置</p>
          <p>📦 配置状态管理</p>
          <p>💼 实现业务功能</p>
        </div>
      </Card>

      <div class="flex justify-center gap-4">
        <Button variant="primary" size="large">主要按钮</Button>
        <Button variant="secondary" size="large">次要按钮</Button>
      </div>
    </div>
  </div>
</template>

