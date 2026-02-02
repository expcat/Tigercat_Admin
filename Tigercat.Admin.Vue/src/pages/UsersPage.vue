<script setup lang="ts">
import { Card, Text, Tag } from '@expcat/tigercat-vue'
import Icon from '../components/Icon.vue'

const quickActions = [
  { label: '新增用户', icon: 'userPlus', description: '创建新用户账号', iconClass: 'text-blue-600' },
  { label: '导入用户', icon: 'upload', description: '批量导入用户数据', iconClass: 'text-purple-600' },
  { label: '权限配置', icon: 'shield', description: '管理用户权限与角色', iconClass: 'text-orange-600' },
  { label: '安全审计', icon: 'search', description: '查看登录与操作记录', iconClass: 'text-green-600' },
]

const statusOverview = [
  { label: '活跃用户', value: '1,024', trend: '+8%', trendUp: true, icon: 'users', iconClass: 'text-blue-600' },
  { label: '待审核', value: '12', trend: '+3', trendUp: true, icon: 'clock', iconClass: 'text-purple-600' },
  { label: '已禁用', value: '5', trend: '-1', trendUp: false, icon: 'ban', iconClass: 'text-orange-600' },
  { label: '今日新增', value: '18', trend: '+4', trendUp: true, icon: 'sparkles', iconClass: 'text-green-600' },
]

const recentUpdates = [
  { id: 'user-apply', title: '新用户申请', detail: 'marketing_lead 申请加入', time: '5 分钟前' },
  { id: 'permission-update', title: '权限调整', detail: 'admin 更新了角色权限', time: '20 分钟前' },
  { id: 'account-freeze', title: '账号冻结', detail: '禁用用户 demo_user', time: '1 小时前' },
  { id: 'batch-import', title: '批量导入', detail: '导入 35 条用户数据', time: '2 小时前' },
]
</script>

<template>
  <div class="space-y-6">
    <Card class="overflow-hidden">
      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4"></div>
        <div class="relative flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white">
                <Icon name="users" :size="24" />
              </div>
              <div>
                <Text size="lg" weight="bold" class="text-slate-800">
                  用户管理
                </Text>
                <Text size="sm" color="secondary">
                  管理平台用户账号、角色与权限
                </Text>
              </div>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-2">
            <Tag color="blue" size="sm">核心模块</Tag>
            <Tag color="green" size="sm">运行中</Tag>
          </div>
        </div>
      </div>
    </Card>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        v-for="(stat, index) in statusOverview"
        :key="stat.label"
        class="group hover:shadow-lg transition-shadow duration-300"
      >
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
            class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            :class="[
              index === 0 ? 'bg-blue-100' : '',
              index === 1 ? 'bg-purple-100' : '',
              index === 2 ? 'bg-orange-100' : '',
              index === 3 ? 'bg-green-100' : '',
            ]"
          >
            <Icon :name="stat.icon" :size="20" :class="stat.iconClass" />
          </div>
        </div>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="快捷操作" class="lg:col-span-1">
        <div class="space-y-3">
          <div
            v-for="(action, index) in quickActions"
            :key="action.label"
            class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-gradient-to-br transition-all duration-300 hover:shadow-md"
            :class="[
              index === 0 ? 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200' : '',
              index === 1 ? 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200' : '',
              index === 2 ? 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200' : '',
              index === 3 ? 'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200' : '',
            ]"
          >
            <div class="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center transition-transform group-hover:scale-110">
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
