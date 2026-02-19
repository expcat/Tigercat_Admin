<script setup lang="ts">
import { Card, Text, Tag } from '@expcat/tigercat-vue'
import Icon from '../components/Icon.vue'
import PageHeader from '../components/PageHeader.vue'

const quickActions = [
  {
    label: '新增角色',
    icon: 'userPlus',
    description: '创建新的角色与权限',
    iconClass: 'text-blue-600',
    bgClass: 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200',
    permission: 'role:create',
  },
  {
    label: '成员分配',
    icon: 'users',
    description: '为角色分配成员',
    iconClass: 'text-purple-600',
    bgClass: 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200',
    permission: 'role:edit',
  },
  {
    label: '权限模板',
    icon: 'clipboard',
    description: '管理权限模板',
    iconClass: 'text-orange-600',
    bgClass: 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200',
    permission: 'role:edit',
  },
  {
    label: '审计日志',
    icon: 'search',
    description: '查看角色变更记录',
    iconClass: 'text-green-600',
    bgClass: 'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200',
  }
]

const statusOverview = [
  {
    label: '系统角色',
    value: '8',
    trend: '+1',
    trendUp: true,
    icon: 'shield',
    bgClass: 'bg-blue-100 text-blue-600'
  },
  {
    label: '自定义角色',
    value: '14',
    trend: '+2',
    trendUp: true,
    icon: 'sparkles',
    bgClass: 'bg-purple-100 text-purple-600'
  },
  {
    label: '待审核',
    value: '3',
    trend: '+1',
    trendUp: true,
    icon: 'clock',
    bgClass: 'bg-orange-100 text-orange-600'
  },
  {
    label: '已禁用',
    value: '1',
    trend: '0',
    trendUp: false,
    icon: 'ban',
    bgClass: 'bg-green-100 text-green-600'
  }
]

const recentUpdates = [
  { id: 'role-create', title: '新增角色', detail: '创建“运营主管”角色', time: '10 分钟前' },
  { id: 'role-update', title: '权限更新', detail: '更新“客服专员”权限', time: '35 分钟前' },
  { id: 'member-adjust', title: '成员调整', detail: '将 user_lee 加入“审核员”', time: '1 小时前' },
  { id: 'role-disable', title: '角色停用', detail: '停用“临时访客”角色', time: '2 小时前' },
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="角色管理"
      subtitle="维护平台角色与权限配置"
      icon="shield"
      :tags="[
        { label: '权限中心', color: 'blue' },
        { label: '已启用', color: 'green' }
      ]"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card v-for="stat in statusOverview" :key="stat.label" class="group hover:shadow-lg transition-shadow duration-300">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <Text size="sm" color="secondary">{{ stat.label }}</Text>
            <div class="text-2xl font-bold mt-2 text-slate-800">{{ stat.value }}</div>
            <div class="mt-2 flex items-center gap-1">
              <Tag :color="stat.trendUp ? 'green' : 'red'" size="sm">
                {{ stat.trendUp ? '↑' : '↓' }} {{ stat.trend }}
              </Tag>
              <Text size="xs" color="secondary">较昨日</Text>
            </div>
          </div>
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
            :class="stat.bgClass"
          >
            <Icon :name="stat.icon" :size="20" />
          </div>
        </div>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="快捷操作" class="lg:col-span-1">
        <div class="space-y-3">
          <div
            v-for="action in quickActions"
            :key="action.label"
            v-permission="action.permission"
            class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-gradient-to-br transition-all duration-300 hover:shadow-md"
            :class="action.bgClass"
          >
            <div class="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center text-xl">
              <Icon :name="action.icon" :size="20" :class="action.iconClass" />
            </div>
            <div class="flex-1">
              <Text size="sm" weight="medium" class="text-slate-800">
                {{ action.label }}
              </Text>
              <Text size="xs" color="secondary" class="mt-1">
                {{ action.description }}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      <Card title="近期动态" class="lg:col-span-2">
        <div class="space-y-4">
          <div
            v-for="item in recentUpdates"
            :key="item.id"
            class="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
          >
            <div class="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-blue-500"></div>
            <div class="flex-1 min-w-0">
              <Text size="sm" class="text-slate-700">{{ item.title }}</Text>
              <Text size="xs" color="secondary" class="mt-1">
                {{ item.detail }}
              </Text>
            </div>
            <Text size="xs" color="secondary">{{ item.time }}</Text>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
