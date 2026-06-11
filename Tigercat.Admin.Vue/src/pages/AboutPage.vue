<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Alert, Card, Text, Tag } from '@expcat/tigercat-vue'
import type { TagVariant } from '@expcat/tigercat-core'
import { apiRequest } from '../utils'
import Icon from '../components/Icon.vue'
import PageHeader from '../components/PageHeader.vue'

interface InfoResponse {
  name: string
  version: string
  description: string
}

const info = ref<InfoResponse | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const CONTAINS_CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/

const getFriendlyErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    if (CONTAINS_CHINESE_CHAR_REGEX.test(error.message)) {
      return error.message
    }
  }
  return '服务信息加载失败，请稍后重试。'
}

const connectionStatus = computed(() => {
  if (loading.value) {
    return { variant: 'primary', label: '连接中' }
  }
  if (errorMessage.value) {
    return { variant: 'danger', label: '连接失败' }
  }
  return { variant: 'success', label: '已连接' }
})

const infoCards = computed(() => [
  {
    label: '服务名称',
    value: info.value?.name || 'Tigercat Admin API',
    icon: 'package',
    iconClass: 'bg-blue-100 text-blue-600'
  },
  {
    label: '当前版本',
    value: info.value?.version || 'v1.0.0',
    icon: 'tag',
    iconClass: 'bg-purple-100 text-purple-600'
  },
  {
    label: '服务描述',
    value: info.value?.description || 'Tigercat Admin Backend API',
    icon: 'megaphone',
    iconClass: 'bg-green-100 text-green-600'
  }
])

const highlights = [
  {
    title: '清晰导航体验',
    description: '统一的侧边栏布局，快速定位关键模块。',
    icon: 'compass',
    className: 'from-blue-50 to-blue-100',
    iconClass: 'text-blue-600'
  },
  {
    title: '安全认证体系',
    description: '基于令牌的认证机制，保障后台安全。',
    icon: 'lock',
    className: 'from-purple-50 to-purple-100',
    iconClass: 'text-purple-600'
  },
  {
    title: '快速响应接口',
    description: '轻量化 API 提供稳定的管理体验。',
    icon: 'zap',
    className: 'from-orange-50 to-orange-100',
    iconClass: 'text-orange-600'
  },
  {
    title: '一致视觉语言',
    description: '保持与首页一致的风格与组件呈现。',
    icon: 'palette',
    className: 'from-green-50 to-green-100',
    iconClass: 'text-green-600'
  }
]

const techStack = [
  {
    label: '前端框架',
    value: 'Vue 3',
    icon: 'package',
    iconClass: 'bg-green-100 text-green-600'
  },
  {
    label: '构建工具',
    value: 'Vite',
    icon: 'zap',
    iconClass: 'bg-orange-100 text-orange-600'
  },
  {
    label: '开发语言',
    value: 'TypeScript',
    icon: 'code',
    iconClass: 'bg-blue-100 text-blue-600'
  },
  {
    label: 'UI 组件',
    value: 'Tigercat UI',
    icon: 'palette',
    iconClass: 'bg-purple-100 text-purple-600'
  }
]

const systemInfo = computed(() => [
  {
    label: '运行环境',
    value: '.NET 10 + Vue 3',
    icon: 'settings',
    iconClass: 'bg-indigo-100 text-indigo-600'
  },
  {
    label: '包管理器',
    value: 'PNPM',
    icon: 'package',
    iconClass: 'bg-blue-100 text-blue-600'
  },
  {
    label: 'API 状态',
    value: connectionStatus.value.label,
    icon: 'globe',
    iconClass: 'bg-green-100 text-green-600',
    tagVariant: connectionStatus.value.variant as TagVariant
  }
])

const loadInfo = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await apiRequest<InfoResponse>('/api/info')
    info.value = data
  } catch (error: unknown) {
    errorMessage.value = getFriendlyErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleAlertClose = () => {
  errorMessage.value = ''
}

onMounted(() => {
  loadInfo()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="关于 Tigercat"
      subtitle="了解平台版本与服务信息"
      icon="info"
      :tags="[
        { label: '系统信息', variant: 'primary' },
        { label: connectionStatus.label, variant: connectionStatus.variant }
      ]"
    />

    <Alert
      v-if="errorMessage"
      type="error"
      title="信息加载失败"
      :description="errorMessage"
      closable
      @close="handleAlertClose"
    />

    <Card title="服务概览">
      <div v-if="loading" class="flex items-center justify-center py-10">
        <Text size="sm" color="secondary">正在加载服务信息...</Text>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="item in infoCards"
          :key="item.label"
          class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="item.iconClass">
            <Icon :name="item.icon" :size="20" />
          </div>
          <div>
            <Text size="xs" color="secondary">{{ item.label }}</Text>
            <Text size="sm" weight="medium" class="text-slate-800">{{ item.value }}</Text>
          </div>
        </div>
      </div>
    </Card>

    <Card title="产品亮点">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in highlights"
          :key="item.title"
          class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-linear-to-br"
          :class="item.className"
        >
          <div class="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center text-xl">
            <Icon :name="item.icon" :size="20" :class="item.iconClass" />
          </div>
          <div>
            <Text size="sm" weight="medium" class="text-slate-800">{{ item.title }}</Text>
            <Text size="xs" color="secondary" class="mt-1">{{ item.description }}</Text>
          </div>
        </div>
      </div>
    </Card>

    <Card title="技术栈">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in techStack"
          :key="item.label"
          class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="item.iconClass">
            <Icon :name="item.icon" :size="20" />
          </div>
          <div>
            <Text size="xs" color="secondary">{{ item.label }}</Text>
            <Text size="sm" weight="medium" class="text-slate-800">{{ item.value }}</Text>
          </div>
        </div>
      </div>
    </Card>

    <Card title="系统信息">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="item in systemInfo"
          :key="item.label"
          class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="item.iconClass">
            <Icon :name="item.icon" :size="20" />
          </div>
          <div>
            <Text size="xs" color="secondary">{{ item.label }}</Text>
            <Tag v-if="item.tagVariant" :variant="item.tagVariant" size="sm">● {{ item.value }}</Tag>
            <Text v-else size="sm" weight="medium" class="text-slate-800">{{ item.value }}</Text>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
