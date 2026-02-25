<script setup lang="ts">
import { inject, ref, onMounted, watch, computed } from 'vue'
import { Alert, Card, Text, Tag, Select, LineChart, BarChart, PieChart, Loading } from '@expcat/tigercat-vue'
import type { Session, StatsOverview, StatsTrend } from '../utils'
import { apiRequest } from '../utils'
import Icon from '../components/Icon.vue'
import AppLogo from '../components/AppLogo.vue'

const homeMessage = inject<import('vue').Ref<string>>('homeMessage', ref(''))
const homeError = inject<import('vue').Ref<string>>('homeError', ref(''))
const session = inject<import('vue').Ref<Session | null>>('session', ref(null))

// 认证 headers
const authHeaders = computed(() =>
  session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}
)

// --- 统计数据状态 ---
const overview = ref<StatsOverview | null>(null)
const trend = ref<StatsTrend | null>(null)
const statsLoading = ref(false)
const trendLoading = ref(false)
const statsError = ref('')
let trendRequestId = 0

// 时间范围（天数）
const trendDays = ref<number>(7)
const trendDaysOptions = [
  { value: 7, label: '近 7 天' },
  { value: 14, label: '近 14 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
]

// --- 统计卡片（基于真实概览数据） ---
const statsCards = computed(() => {
  const o = overview.value
  return [
    { label: '总用户数', value: o ? String(o.totalUsers) : '-', icon: 'users', iconClass: 'text-blue-600', bgClass: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: '活跃用户', value: o ? String(o.activeUsers) : '-', icon: 'activity', iconClass: 'text-purple-600', bgClass: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: '总角色数', value: o ? String(o.totalRoles) : '-', icon: 'shield', iconClass: 'text-orange-600', bgClass: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: '总权限数', value: o ? String(o.totalPermissions) : '-', icon: 'shieldCheck', iconClass: 'text-green-600', bgClass: 'bg-green-100 dark:bg-green-900/30' },
  ]
})

// --- 图表数据 ---
const trendChartData = computed(() => {
  if (!trend.value) return []
  return trend.value.points.map(p => ({ x: p.date, y: p.count }))
})

const distributionChartData = computed(() => {
  if (!overview.value) return []
  return [
    { value: overview.value.activeUsers, label: 'Active' },
    { value: overview.value.disabledUsers, label: 'Disabled' },
  ]
})

// --- API 请求 ---
async function fetchOverview() {
  const res = await apiRequest<StatsOverview>('/api/stats/overview', {
    headers: authHeaders.value,
  })
  overview.value = res.data
}

async function fetchTrend() {
  const id = ++trendRequestId
  const res = await apiRequest<StatsTrend>(`/api/stats/trend?days=${trendDays.value}`, {
    headers: authHeaders.value,
  })
  // 仅当此请求仍是最新请求时才更新数据，避免竞态
  if (id === trendRequestId) {
    trend.value = res.data
  }
}

async function loadStats() {
  statsLoading.value = true
  statsError.value = ''
  try {
    await Promise.all([fetchOverview(), fetchTrend()])
  } catch (e: any) {
    statsError.value = e.message || '加载统计数据失败'
  } finally {
    statsLoading.value = false
  }
}

// 切换时间范围时重新加载趋势
watch(trendDays, async () => {
  trendLoading.value = true
  try {
    await fetchTrend()
  } catch (e: any) {
    statsError.value = e.message || '加载趋势数据失败'
  } finally {
    trendLoading.value = false
  }
})

onMounted(loadStats)

// 快捷操作
const quickActions = [
  { label: '用户管理', icon: 'users', key: 'users' },
  { label: '角色配置', icon: 'shield', key: 'roles' },
  { label: '系统设置', icon: 'settings', key: 'settings' },
  { label: '查看日志', icon: 'fileText', key: 'logs' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎区域 -->
    <Card class="overflow-hidden">
      <div class="relative">
        <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4"></div>
        <div class="relative flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <AppLogo class="drop-shadow-sm" />
              <div>
                <Text size="lg" weight="bold" class="text-slate-800">
                  欢迎回来，{{ session?.username || 'Admin' }}！
                </Text>
                <Text size="sm" color="secondary">
                  {{ homeMessage || '今天是个好日子，让我们开始工作吧！' }}
                </Text>
              </div>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-2">
            <Tag color="blue" size="sm">管理员</Tag>
            <Tag color="green" size="sm">已认证</Tag>
          </div>
        </div>
      </div>
    </Card>

    <!-- 加载错误提示 -->
    <Alert
      v-if="homeError || statsError"
      type="error"
      title="数据加载失败"
      :description="homeError || statsError"
      closable
    />

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        v-for="stat in statsCards"
        :key="stat.label"
        class="group hover:shadow-lg transition-shadow duration-300"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <Text size="sm" color="secondary">{{ stat.label }}</Text>
            <div class="text-2xl font-bold mt-2 text-slate-800">
              <Loading v-if="statsLoading" size="sm" />
              <template v-else>{{ stat.value }}</template>
            </div>
          </div>
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            :class="stat.bgClass"
          >
            <Icon :name="stat.icon" :size="20" :class="stat.iconClass" />
          </div>
        </div>
      </Card>
    </div>

    <!-- 图表区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 用户创建趋势（折线图） -->
      <Card class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <Text size="base" weight="bold">用户创建趋势</Text>
            <div class="w-36">
              <Select
                v-model="trendDays"
                :options="trendDaysOptions"
                size="sm"
                :clearable="false"
              />
            </div>
          </div>
        </template>
        <div v-if="statsLoading || trendLoading" class="flex items-center justify-center h-52">
          <Loading />
        </div>
        <LineChart
          v-else-if="trendChartData.length"
          :data="trendChartData"
          :height="220"
          :show-area="true"
          :area-opacity="0.15"
          :show-points="true"
          :point-size="4"
          :include-zero="true"
          line-color="#3b82f6"
          :animated="true"
          x-axis-label="日期"
          y-axis-label="新增用户"
          :x-tick-format="(v: string | number) => String(v).slice(5)"
        />
        <div v-else class="flex items-center justify-center h-52 text-slate-400">
          <Text size="sm" color="secondary">暂无趋势数据</Text>
        </div>
      </Card>

      <!-- 用户状态分布（饼图） -->
      <Card title="用户状态分布" class="lg:col-span-1">
        <div v-if="statsLoading" class="flex items-center justify-center h-52">
          <Loading />
        </div>
        <PieChart
          v-else-if="distributionChartData.length"
          :data="distributionChartData"
          :height="220"
          :colors="['#3b82f6', '#ef4444']"
          :show-labels="true"
          label-position="outside"
          :show-legend="true"
          legend-position="bottom"
        />
        <div v-else class="flex items-center justify-center h-52 text-slate-400">
          <Text size="sm" color="secondary">暂无分布数据</Text>
        </div>
      </Card>
    </div>

    <!-- 内容区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 快捷操作 -->
      <Card title="快捷操作" class="lg:col-span-1">
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="(action, index) in quickActions"
            :key="action.key"
            class="group flex flex-col items-center justify-center p-4 rounded-xl bg-linear-to-br transition-all duration-300 cursor-pointer border border-slate-200 hover:border-transparent hover:shadow-md"
            :class="[
              index === 0 ? 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200' : '',
              index === 1 ? 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200' : '',
              index === 2 ? 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200' : '',
              index === 3 ? 'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200' : '',
            ]"
          >
            <div class="mb-2 transition-transform group-hover:scale-110">
              <Icon :name="action.icon" :size="24" :class="[
                index === 0 ? 'text-blue-600' : '',
                index === 1 ? 'text-purple-600' : '',
                index === 2 ? 'text-orange-600' : '',
                index === 3 ? 'text-green-600' : '',
              ]" />
            </div>
            <Text size="sm" weight="medium">{{ action.label }}</Text>
          </button>
        </div>
      </Card>

      <!-- 概览详情（柱状图） -->
      <Card title="用户概览" class="lg:col-span-2">
        <div v-if="statsLoading" class="flex items-center justify-center h-52">
          <Loading />
        </div>
        <BarChart
          v-else-if="overview"
          :data="[
            { value: overview.totalUsers, label: '总用户', color: '#3b82f6' },
            { value: overview.activeUsers, label: '活跃', color: '#22c55e' },
            { value: overview.disabledUsers, label: '禁用', color: '#ef4444' },
            { value: overview.totalRoles, label: '角色', color: '#a855f7' },
            { value: overview.totalPermissions, label: '权限', color: '#f97316' },
          ]"
          :height="220"
          :show-grid="true"
          :animated="true"
          :bar-radius="6"
          y-axis-label="数量"
        />
        <div v-else class="flex items-center justify-center h-52 text-slate-400">
          <Text size="sm" color="secondary">暂无概览数据</Text>
        </div>
      </Card>
    </div>

    <!-- 系统信息 -->
    <Card title="系统信息">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Icon name="package" :size="20" />
          </div>
          <div>
            <Text size="xs" color="secondary">系统版本</Text>
            <Text size="sm" weight="medium">v1.0.0</Text>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            <Icon name="zap" :size="20" />
          </div>
          <div>
            <Text size="xs" color="secondary">运行环境</Text>
            <Text size="sm" weight="medium">.NET 10 + Vue 3</Text>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <Icon name="calendar" :size="20" />
          </div>
          <div>
            <Text size="xs" color="secondary">最后更新</Text>
            <Text size="sm" weight="medium">2026-01-28</Text>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
            <Icon name="globe" :size="20" />
          </div>
          <div>
            <Text size="xs" color="secondary">API 状态</Text>
            <Tag color="green" size="sm">● 在线</Tag>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
