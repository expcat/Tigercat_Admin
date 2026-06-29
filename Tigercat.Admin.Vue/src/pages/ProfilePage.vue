<script setup lang="ts">
import { reactive, ref, inject, computed } from 'vue'
import { Card, Text, Tag, Button, Avatar, Switch, Message } from '@expcat/tigercat-vue'
import { Tabs } from '@expcat/tigercat-vue/Tabs'
import { TabPane } from '@expcat/tigercat-vue/TabPane'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Rate } from '@expcat/tigercat-vue/Rate'
import { QRCode } from '@expcat/tigercat-vue/QRCode'
import { Signature } from '@expcat/tigercat-vue/Signature'
import { ColorSwatch } from '@expcat/tigercat-vue/ColorSwatch'
import { Timeline } from '@expcat/tigercat-vue/Timeline'
import { List } from '@expcat/tigercat-vue/List'
import { Badge } from '@expcat/tigercat-vue/Badge'
import { Divider } from '@expcat/tigercat-vue/Divider'
import { Space } from '@expcat/tigercat-vue/Space'
import { Radio } from '@expcat/tigercat-vue/Radio'
import { RadioGroup } from '@expcat/tigercat-vue/RadioGroup'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { Slider } from '@expcat/tigercat-vue/Slider'
import { DatePicker } from '@expcat/tigercat-vue/DatePicker'
import { TimePicker } from '@expcat/tigercat-vue/TimePicker'
import type {
  DescriptionsItem,
  TimelineItem,
  ListItem,
  DatePickerSingleModelValue,
  TimePickerRangeValue,
  TimePickerModelValue,
} from '@expcat/tigercat-core'
import type { Session } from '../utils'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'

const session = inject<import('vue').Ref<Session | null>>('session', ref(null))

const activeTab = ref<string | number>('basic')

const username = computed(() => session?.value?.username ?? 'Admin')
const avatarInitial = computed(() => username.value.charAt(0).toUpperCase())

const profile = reactive({
  email: 'admin@tigercat.dev',
  role: '超级管理员',
  department: '平台研发部',
  registeredAt: '2025-08-12',
  lastLoginAt: '2026-06-29 09:12',
})

const basicItems = computed<DescriptionsItem[]>(() => [
  { label: '用户名', content: username.value },
  { label: '邮箱', content: profile.email },
  { label: '角色', content: profile.role },
  { label: '部门', content: profile.department },
  { label: '注册时间', content: profile.registeredAt },
  { label: '最近登录', content: profile.lastLoginAt },
])

const accountLevel = ref(4)

// 安全设置
const security = reactive({
  twoFactor: true,
  loginAlert: true,
  remoteProtect: false,
})
const signature = ref('')
const totpUri =
  'otpauth://totp/TigercatAdmin:admin?secret=JBSWY3DPEHPK3PXP&issuer=Tigercat'

// 偏好
const density = ref<string>('comfortable')
const themeColor = ref<string>('#3b82f6')
const fontSize = ref<number>(14)
const birthday = ref<DatePickerSingleModelValue>(null)
const quietHours = ref<TimePickerRangeValue>(['22:00', '07:00'])
const bio = ref('负责 Tigercat 后台平台的整体架构与组件治理。')
const emailDigest = ref(true)
const swatchColors = ['#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f97316', '#14b8a6']
const fontMarks: Record<number, string> = { 12: '小', 16: '中', 20: '大' }

// 登录设备
const devices = ref<ListItem[]>([
  { key: 'd1', title: 'MacBook Pro · Chrome', description: '上海 · 当前设备 · 192.168.1.20' },
  { key: 'd2', title: 'iPhone 15 · Safari', description: '上海 · 移动网络 · 10 分钟前活跃' },
  { key: 'd3', title: 'Windows · Edge', description: '北京 · 3 天前活跃' },
])
const loginHistory = ref<TimelineItem[]>([
  { key: 'h1', label: '2026-06-29 09:12', content: '登录成功 · MacBook Pro · Chrome', color: '#22c55e' },
  { key: 'h2', label: '2026-06-28 18:40', content: '退出登录 · MacBook Pro', color: '#64748b' },
  { key: 'h3', label: '2026-06-26 08:05', content: '登录成功 · iPhone 15 · Safari', color: '#22c55e' },
  { key: 'h4', label: '2026-06-22 21:30', content: '异地登录提醒 · 北京 · Edge', color: '#f97316' },
])

function handleTabChange(key: string | number) {
  activeTab.value = key
}
function handleDensityChange(value: string | number) {
  density.value = String(value)
}
function handleFontSizeChange(value: number | [number, number]) {
  fontSize.value = typeof value === 'number' ? value : value[0]
}
function handleBirthdayChange(value: unknown) {
  birthday.value = value as DatePickerSingleModelValue
}
function handleQuietHoursChange(value: TimePickerModelValue) {
  if (Array.isArray(value)) {
    quietHours.value = value
  }
}
function handleSave(scope: string) {
  Message.success({ content: `${scope}已保存（演示）`, duration: 2400 })
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="user"
      title="个人中心"
      subtitle="管理你的资料、安全选项、偏好与登录设备"
      :tags="[
        { label: '已认证', variant: 'success' },
        { label: '管理员', variant: 'primary' },
      ]"
    />

    <Tabs :active-key="activeTab" @update:active-key="handleTabChange">
      <!-- 基本资料 -->
      <TabPane tab-key="basic" label="基本资料">
        <div class="space-y-6">
          <Card>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-4">
                <Badge type="dot" variant="success">
                  <Avatar
                    size="xl"
                    class="font-bold bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white"
                  >
                    {{ avatarInitial }}
                  </Avatar>
                </Badge>
                <div class="min-w-0">
                  <Text size="lg" weight="bold" class="p2-text-primary">{{ username }}</Text>
                  <div class="mt-1 flex items-center gap-2">
                    <Tag variant="primary" size="sm">{{ profile.role }}</Tag>
                    <Text size="sm" color="secondary">{{ profile.department }}</Text>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Text size="sm" color="secondary">账号活跃度</Text>
                <Rate :model-value="accountLevel" disabled allow-half />
              </div>
            </div>
          </Card>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card><Statistic title="登录次数" :value="1280" group-separator /></Card>
            <Card><Statistic title="积分" :value="4860" suffix="分" /></Card>
            <Card><Statistic title="连续在线" :value="36" suffix="天" /></Card>
          </div>

          <Card title="资料详情">
            <Descriptions :items="basicItems" :column="{ xs: 1, sm: 2, lg: 3 }" bordered colon />
          </Card>
        </div>
      </TabPane>

      <!-- 安全设置 -->
      <TabPane tab-key="security" label="安全设置">
        <div class="space-y-6">
          <Card title="安全选项">
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-4 py-2">
                <div class="min-w-0">
                  <Text weight="medium">两步验证</Text>
                  <Text size="sm" color="secondary" class="block">登录时额外校验身份验证器动态码</Text>
                </div>
                <Switch v-model:checked="security.twoFactor" />
              </div>
              <Divider spacing="sm" />
              <div class="flex items-center justify-between gap-4 py-2">
                <div class="min-w-0">
                  <Text weight="medium">登录提醒</Text>
                  <Text size="sm" color="secondary" class="block">新设备登录时发送邮件通知</Text>
                </div>
                <Switch v-model:checked="security.loginAlert" />
              </div>
              <Divider spacing="sm" />
              <div class="flex items-center justify-between gap-4 py-2">
                <div class="min-w-0">
                  <Text weight="medium">异地登录保护</Text>
                  <Text size="sm" color="secondary" class="block">非常用地登录时需二次确认</Text>
                </div>
                <Switch v-model:checked="security.remoteProtect" />
              </div>
            </div>
          </Card>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="两步验证绑定">
              <div class="flex flex-col items-center gap-3">
                <QRCode :value="totpUri" :size="160" />
                <MutedPanel description="使用身份验证器 App 扫描二维码完成绑定（演示数据，不会真正生效）。" />
              </div>
            </Card>

            <Card title="电子签名">
              <Signature v-model="signature" :height="160" clearable />
              <Space class="mt-3">
                <Button variant="outline" @click="signature = ''">清除</Button>
                <Button @click="handleSave('电子签名')">保存签名</Button>
              </Space>
            </Card>
          </div>
        </div>
      </TabPane>

      <!-- 偏好 -->
      <TabPane tab-key="preference" label="偏好">
        <Card title="界面与通知偏好">
          <div class="space-y-6">
            <div>
              <Text weight="medium" class="mb-2 block">界面密度</Text>
              <RadioGroup :value="density" @update:value="handleDensityChange">
                <Space>
                  <Radio :value="'compact'">紧凑</Radio>
                  <Radio :value="'comfortable'">适中</Radio>
                  <Radio :value="'loose'">宽松</Radio>
                </Space>
              </RadioGroup>
            </div>

            <div>
              <Text weight="medium" class="mb-2 block">主题色</Text>
              <ColorSwatch v-model="themeColor" :colors="swatchColors" :columns="6" />
            </div>

            <div>
              <Text weight="medium" class="mb-2 block">界面字号</Text>
              <div class="max-w-sm">
                <Slider
                  :value="fontSize"
                  @update:value="handleFontSizeChange"
                  :min="12"
                  :max="20"
                  :step="1"
                  :marks="fontMarks"
                  tooltip
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Text weight="medium" class="mb-2 block">生日</Text>
                <DatePicker
                  :model-value="birthday"
                  @update:model-value="handleBirthdayChange"
                  placeholder="选择生日"
                  clearable
                />
              </div>
              <div>
                <Text weight="medium" class="mb-2 block">免打扰时段</Text>
                <TimePicker
                  :model-value="quietHours"
                  @update:model-value="handleQuietHoursChange"
                  range
                  :show-seconds="false"
                />
              </div>
            </div>

            <div>
              <Text weight="medium" class="mb-2 block">个人简介</Text>
              <Textarea v-model="bio" :rows="4" :max-length="200" show-count placeholder="介绍一下你自己" />
            </div>

            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <Text weight="medium">邮件摘要</Text>
                <Text size="sm" color="secondary" class="block">每周发送一次工作摘要邮件</Text>
              </div>
              <Switch v-model:checked="emailDigest" />
            </div>

            <div class="flex justify-end">
              <Button @click="handleSave('偏好设置')">保存偏好</Button>
            </div>
          </div>
        </Card>
      </TabPane>

      <!-- 登录设备 -->
      <TabPane tab-key="devices" label="登录设备">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <template #header>
              <div class="flex items-center gap-2">
                <Text weight="bold">当前登录设备</Text>
                <Badge :content="devices.length" variant="primary" standalone />
              </div>
            </template>
            <List :data-source="devices" bordered="bordered" />
          </Card>

          <Card title="登录历史">
            <Timeline :items="loginHistory" />
          </Card>
        </div>
      </TabPane>
    </Tabs>
  </div>
</template>
