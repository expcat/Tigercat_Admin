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
    <Card>
      <div class="flex items-center justify-between">
        <div>
          <Text size="lg" weight="bold" class="text-slate-800">
            👋 欢迎回来，{{ username || 'Admin' }}！
          </Text>
          <Text size="sm" color="secondary" class="mt-1">
            {{ homeMessage || '今天是个好日子，让我们开始工作吧！' }}
          </Text>
        </div>
        <div class="text-4xl">🐯</div>
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
      <Card v-for="stat in stats" :key="stat.label">
        <div class="flex items-start justify-between">
          <div>
            <Text size="sm" color="secondary">{{ stat.label }}</Text>
            <div class="text-2xl font-bold mt-2 text-slate-800">{{ stat.value }}</div>
            <div v-if="stat.trend" class="mt-2 flex items-center gap-1">
              <Tag 
                :color="stat.trendUp ? 'green' : 'red'" 
                size="sm"
              >
                {{ stat.trend }}
              </Tag>
              <Text size="xs" color="secondary">较昨日</Text>
            </div>
            <div v-if="stat.status" class="mt-2">
              <Tag color="green" size="sm">运行中</Tag>
            </div>
          </div>
          <div class="text-3xl opacity-80">{{ stat.icon }}</div>
        </div>
      </Card>
    </div>

    <!-- 内容区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 快捷操作 -->
      <Card title="快捷操作" class="lg:col-span-1">
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="action in quickActions"
            :key="action.key"
            class="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
          >
            <span class="text-2xl mb-2">{{ action.icon }}</span>
            <Text size="sm">{{ action.label }}</Text>
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
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <Text size="sm" color="secondary">系统版本</Text>
          <Text size="sm" weight="medium" class="mt-1">v1.0.0</Text>
        </div>
        <div>
          <Text size="sm" color="secondary">运行环境</Text>
          <Text size="sm" weight="medium" class="mt-1">.NET 10 + Vue 3</Text>
        </div>
        <div>
          <Text size="sm" color="secondary">最后更新</Text>
          <Text size="sm" weight="medium" class="mt-1">2026-01-28</Text>
        </div>
        <div>
          <Text size="sm" color="secondary">API 状态</Text>
          <Tag color="green" size="sm">在线</Tag>
        </div>
      </div>
    </Card>
  </div>
</template>
