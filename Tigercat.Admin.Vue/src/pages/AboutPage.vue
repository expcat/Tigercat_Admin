<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { CopyButton } from '@expcat/tigercat-vue/CopyButton'
import { usePermission } from '../utils/permission'
import type { InfoResponse } from '../utils/types'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Card } from '@expcat/tigercat-vue/Card'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@expcat/tigercat-vue/NavigationMenu'
import type { TagVariant } from '@expcat/tigercat-core'
import { apiRequest } from '../utils'
import Icon from '../components/Icon.vue'
import PageHeader from '../components/PageHeader.vue'

const tigercatVersion = import.meta.env.VITE_TIGERCAT_UI_VERSION

const info = ref<InfoResponse | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const { has: hasPerm } = usePermission()
let infoRequest: AbortController | null = null
onBeforeUnmount(() => infoRequest?.abort())

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
  if (!info.value) {
    return { variant: 'danger', label: '连接失败' }
  }
  return { variant: 'success', label: '已连接' }
})

const infoCards = computed(() => [
  {
    label: '服务名称',
    value: info.value?.name || 'Tigercat Admin API',
    icon: 'package',
    iconClass: 'bg-(--tiger-primary)/10 text-(--tiger-primary)'
  },
  {
    label: 'API 服务版本',
    value: info.value?.version || '—',
    icon: 'tag',
    iconClass: 'bg-(--tiger-primary)/10 text-(--tiger-primary)'
  },
  {
    label: '服务描述',
    value: info.value?.description || 'Tigercat Admin Backend API',
    icon: 'megaphone',
    iconClass: 'bg-(--tiger-success,#16a34a)/10 text-(--tiger-success,#16a34a)'
  }
])

const highlights = [
  {
    title: '内容与媒体',
    description: '上传文件、查看媒体详情、标注与引用，并复制资源链接。',
    icon: 'compass',
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
    iconClass: 'text-(--tiger-primary)'
  },
  {
    title: 'CSV 用户导入',
    description: 'UTF-8 CSV 字段映射、预览校验与逐行结果，刷新可恢复导入任务。',
    icon: 'lock',
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
    iconClass: 'text-(--tiger-primary)'
  },
  {
    title: '协作与审批',
    description: '我的工作台汇集任务、共享通知与团队日程，审批明确使用独立演示身份。',
    icon: 'zap',
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
    iconClass: 'text-(--tiger-warning,#d97706)'
  },
  {
    title: '报表与外观',
    description: '统计预览、导出与打印共用数据，支持窄屏及深浅色主题。',
    icon: 'palette',
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
    iconClass: 'text-(--tiger-success,#16a34a)'
  }
]

const techStack = [
  {
    label: '前端框架',
    value: 'Vue 3',
    icon: 'package',
    iconClass: 'bg-(--tiger-success,#16a34a)/10 text-(--tiger-success,#16a34a)'
  },
  {
    label: '构建工具',
    value: 'Vite',
    icon: 'zap',
    iconClass: 'bg-(--tiger-warning,#d97706)/10 text-(--tiger-warning,#d97706)'
  },
  {
    label: '开发语言',
    value: 'TypeScript',
    icon: 'code',
    iconClass: 'bg-(--tiger-primary)/10 text-(--tiger-primary)'
  },
  {
    label: 'UI 组件',
    value: `Tigercat UI ${tigercatVersion}`,
    icon: 'palette',
    iconClass: 'bg-(--tiger-primary)/10 text-(--tiger-primary)'
  }
]

const systemInfo = computed(() => [
  {
    label: '运行环境',
    value: '.NET 10 + Vue 3',
    icon: 'settings',
    iconClass: 'bg-(--tiger-info,#3b82f6)/10 text-(--tiger-info,#3b82f6)'
  },
  {
    label: '包管理器',
    value: 'PNPM',
    icon: 'package',
    iconClass: 'bg-(--tiger-primary)/10 text-(--tiger-primary)'
  },
  {
    label: 'API 状态',
    value: connectionStatus.value.label,
    icon: 'globe',
    iconClass: 'bg-(--tiger-success,#16a34a)/10 text-(--tiger-success,#16a34a)',
    tagVariant: connectionStatus.value.variant as TagVariant
  }
])

const loadInfo = async () => {
  infoRequest?.abort()
  const request = new AbortController()
  infoRequest = request
  loading.value = true
  info.value = null
  errorMessage.value = ''
  try {
    const { data } = await apiRequest<InfoResponse>('/api/info', { signal: request.signal })
    if (request.signal.aborted) return
    if (!data) throw new Error('服务信息为空，请重试。')
    info.value = data
  } catch (error: unknown) {
    if (!request.signal.aborted) errorMessage.value = getFriendlyErrorMessage(error)
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

const handleAlertClose = () => {
  errorMessage.value = ''
}

const ABOUT_SECTIONS = [
  {
    key: 'info',
    href: '#about-info',
    label: '服务信息',
  },
  {
    key: 'features',
    href: '#about-features',
    label: '特性',
  },
  {
    key: 'stack',
    href: '#about-stack',
    label: '技术栈',
  },
] as const

function scrollToAboutSection(event: MouseEvent, href: string) {
  event.preventDefault()
  const id = href.replace('#', '')
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        { label: connectionStatus.label, variant: connectionStatus.variant as TagVariant }
      ]"
    />

    <NavigationMenu aria-label="关于分区" class-name="min-w-0 overflow-x-auto">
      <NavigationMenuList>
        <NavigationMenuItem
          v-for="section in ABOUT_SECTIONS"
          :key="section.key"
          :value="section.key"
        >
          <NavigationMenuLink
            :href="section.href"
            @click="scrollToAboutSection($event, section.href)"
          >
            {{ section.label }}
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>

    <Alert
      v-if="errorMessage"
      type="error"
      title="信息加载失败"
      :description="errorMessage"
      closable
      @close="handleAlertClose"
    />

    <div id="about-info">
    <Card>
      <template #header><Text weight="bold">服务概览</Text></template>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <Tag :variant="connectionStatus.variant as TagVariant">{{ connectionStatus.label }}</Tag>
        <Button variant="outline" size="sm" :loading="loading" :disabled="loading" @click="loadInfo">重新连接服务</Button>
        <CopyButton v-if="info" :text="`服务：${info.name}\nAPI 服务版本：${info.version}\n描述：${info.description}\nTigercat UI：${tigercatVersion}`" label="复制服务信息" />
      </div>
      <div v-if="loading" class="flex items-center justify-center py-10">
        <Text size="sm" color="secondary">正在加载服务信息...</Text>
      </div>
      <Text v-else-if="!info" tag="p" size="sm" color="secondary">尚未获取服务信息，请重新连接服务。</Text>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="item in infoCards"
          :key="item.label"
          class="min-w-0 flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)"
        >
          <div class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center" :class="item.iconClass">
            <Icon :name="item.icon" :size="20" />
          </div>
          <div class="min-w-0 break-words">
            <Text size="xs" color="secondary">{{ item.label }}</Text>
            <Text size="sm" weight="medium">{{ item.value }}</Text>
          </div>
        </div>
      </div>
    </Card>
    </div>

    <div id="about-features">
    <Card>
      <template #header><Text weight="bold">产品亮点</Text></template>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in highlights"
          :key="item.title"
          class="flex items-start gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-linear-to-br"
          :class="item.className"
        >
          <div class="w-10 h-10 rounded-lg bg-(--tiger-surface,#ffffff) flex items-center justify-center text-xl">
            <Icon :name="item.icon" :size="20" :class="item.iconClass" />
          </div>
          <div>
            <Text size="sm" weight="medium">{{ item.title }}</Text>
            <Text size="xs" color="secondary" class="mt-1">{{ item.description }}</Text>
          </div>
        </div>
      </div>
    </Card>
    </div>

    <Card>
      <template #header><Text weight="bold">常用入口</Text></template>
      <div class="flex flex-wrap gap-4">
          <RouterLink class="p2-text-primary underline" to="/workspace">我的工作台</RouterLink>
        <RouterLink v-if="hasPerm('media:view')" class="p2-text-primary underline" to="/files">文件管理与媒体详情</RouterLink>
        <RouterLink v-if="hasPerm('user:create')" class="p2-text-primary underline" to="/import">CSV 导入与结果</RouterLink>
        <RouterLink class="p2-text-primary underline" to="/reports">报表预览与打印</RouterLink>
        <RouterLink class="p2-text-primary underline" to="/help">帮助中心</RouterLink>
      </div>
    </Card>

    <div id="about-stack">
    <Card>
      <template #header><Text weight="bold">技术栈</Text></template>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in techStack"
          :key="item.label"
          class="min-w-0 flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)"
        >
          <div class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center" :class="item.iconClass">
            <Icon :name="item.icon" :size="20" />
          </div>
          <div class="min-w-0 break-words">
            <Text size="xs" color="secondary">{{ item.label }}</Text>
            <Text size="sm" weight="medium">{{ item.value }}</Text>
          </div>
        </div>
      </div>
    </Card>
    </div>

    <Card>
      <template #header><Text weight="bold">系统信息</Text></template>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="item in systemInfo"
          :key="item.label"
          class="min-w-0 flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)"
        >
          <div class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center" :class="item.iconClass">
            <Icon :name="item.icon" :size="20" />
          </div>
          <div class="min-w-0 break-words">
            <Text size="xs" color="secondary">{{ item.label }}</Text>
            <Tag v-if="item.tagVariant" :variant="item.tagVariant" size="sm">● {{ item.value }}</Tag>
            <Text v-else size="sm" weight="medium">{{ item.value }}</Text>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
