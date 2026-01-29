<script setup lang="ts">
import { Alert, Card, Text, Badge, Button, Space, Tag } from '@expcat/tigercat-vue'

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

defineProps<{
  notice?: Notice;
  homeMessage?: string;
  homeError?: string;
  username?: string;
}>()

// 模拟统计数据
const stats = [
  { label: '总用户数', value: '1,234', trend: '+12%', trendUp: true, icon: '👥' },
  { label: '活跃会话', value: '56', trend: '+5', trendUp: true, icon: '🔗' },
  { label: '今日登录', value: '128', trend: '-3%', trendUp: false, icon: '📈' },
  { label: '系统状态', value: '正常', status: 'success', icon: '✅' },
]

// 快捷操作
const quickActions = [
  { label: '用户管理', icon: '👥', key: 'users' },
  { label: '角色配置', icon: '🛡️', key: 'roles' },
  { label: '系统设置', icon: '⚙️', key: 'settings' },
  { label: '查看日志', icon: '📋', key: 'logs' },
]

// 最近活动
const recentActivities = [
  { time: '10 分钟前', action: '用户 admin 登录系统', type: 'info' },
  { time: '30 分钟前', action: '新用户 test_user 注册', type: 'success' },
  { time: '1 小时前', action: '系统配置已更新', type: 'warning' },
  { time: '2 小时前', action: '用户 demo 修改密码', type: 'info' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- 通知提示 -->
    <Alert
      v-if="notice?.message"
      :type="notice.type || 'info'"
      :title="notice.type === 'error' ? '操作失败' : '操作成功'"
      :description="notice.message"
      closable
    />

    <!-- 欢迎区域 -->
    <Card class="overflow-hidden">
      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4"></div>
        <div class="relative flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <span class="text-xl text-white">🐯</span>
              </div>
              <div>
                <Text size="lg" weight="bold" class="text-slate-800">
                  欢迎回来，{{ username || 'Admin' }}！
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
      v-if="homeError" 
      type="error" 
      title="数据加载失败" 
      :description="homeError" 
      closable 
    />

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card 
        v-for="(stat, index) in stats" 
        :key="stat.label"
        class="group hover:shadow-lg transition-shadow duration-300"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <Text size="sm" color="secondary">{{ stat.label }}</Text>
            <div class="text-2xl font-bold mt-2 text-slate-800">{{ stat.value }}</div>
            <div v-if="stat.trend" class="mt-2 flex items-center gap-1">
              <Tag 
                :color="stat.trendUp ? 'green' : 'red'" 
                size="sm"
              >
                {{ stat.trendUp ? '↑' : '↓' }} {{ stat.trend }}
              </Tag>
              <Text size="xs" color="secondary">较昨日</Text>
            </div>
            <div v-if="stat.status" class="mt-2">
              <Tag color="green" size="sm">● 运行中</Tag>
            </div>
          </div>
          <div 
            class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
            :class="[
              index === 0 ? 'bg-blue-100' : '',
              index === 1 ? 'bg-purple-100' : '',
              index === 2 ? 'bg-orange-100' : '',
              index === 3 ? 'bg-green-100' : '',
            ]"
          >
            {{ stat.icon }}
          </div>
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
            class="group flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br transition-all duration-300 cursor-pointer border border-slate-200 hover:border-transparent hover:shadow-md"
            :class="[
              index === 0 ? 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200' : '',
              index === 1 ? 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200' : '',
              index === 2 ? 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200' : '',
              index === 3 ? 'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200' : '',
            ]"
          >
            <span class="text-2xl mb-2 transition-transform group-hover:scale-110">{{ action.icon }}</span>
            <Text size="sm" weight="medium">{{ action.label }}</Text>
          </button>
        </div>
      </Card>

      <!-- 最近活动 -->
      <Card title="最近活动" class="lg:col-span-2">
        <div class="space-y-4">
          <div
            v-for="(activity, index) in recentActivities"
            :key="index"
            class="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
          >
            <div 
              class="w-2 h-2 rounded-full mt-2 flex-shrink-0"
              :class="{
                'bg-blue-500': activity.type === 'info',
                'bg-green-500': activity.type === 'success',
                'bg-yellow-500': activity.type === 'warning',
                'bg-red-500': activity.type === 'error',
              }"
            ></div>
            <div class="flex-1 min-w-0">
              <Text size="sm" class="text-slate-700">{{ activity.action }}</Text>
              <Text size="xs" color="secondary" class="mt-1">{{ activity.time }}</Text>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- 系统信息 -->
    <Card title="系统信息">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">📦</div>
          <div>
            <Text size="xs" color="secondary">系统版本</Text>
            <Text size="sm" weight="medium">v1.0.0</Text>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">⚡</div>
          <div>
            <Text size="xs" color="secondary">运行环境</Text>
            <Text size="sm" weight="medium">.NET 10 + Vue 3</Text>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">📅</div>
          <div>
            <Text size="xs" color="secondary">最后更新</Text>
            <Text size="sm" weight="medium">2026-01-28</Text>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">🌐</div>
          <div>
            <Text size="xs" color="secondary">API 状态</Text>
            <Tag color="green" size="sm">● 在线</Tag>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
