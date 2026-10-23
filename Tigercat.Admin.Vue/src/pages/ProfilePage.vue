<script setup lang="ts">
import { reactive, ref, inject, computed, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { Avatar } from '@expcat/tigercat-vue/Avatar'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Message } from '@expcat/tigercat-vue/Message'
import { Switch } from '@expcat/tigercat-vue/Switch'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Tabs } from '@expcat/tigercat-vue/Tabs'
import { TabPane } from '@expcat/tigercat-vue/TabPane'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Rate } from '@expcat/tigercat-vue/Rate'
import { Alert } from '@expcat/tigercat-vue/Alert'
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
import { InputOTP } from '@expcat/tigercat-vue/InputOTP'
import { MaskInput } from '@expcat/tigercat-vue/MaskInput'
import { Row } from '@expcat/tigercat-vue/Row'
import { Col } from '@expcat/tigercat-vue/Col'
import type {
  DescriptionsItem,
  TimelineItem,
  ListItem,
  DatePickerModelValue,
  TimePickerModelValue,
} from '@expcat/tigercat-core'
import {
  DEMO_OTP_CODE,
  OTP_LENGTH,
  PHONE_MASK,
  fetchTwoFactorStatus,
  updateTwoFactorEnabled,
  type Session,
} from '../utils'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'

const session = inject<import('vue').Ref<Session | null>>('session', ref(null))

const activeTab = ref<string | number>('basic')

const username = computed(() => session?.value?.username ?? 'Admin')
const avatarInitial = computed(() => username.value.charAt(0).toUpperCase())

const basicItems = computed<DescriptionsItem[]>(() => [
  { label: '用户名', content: username.value },
  { label: '资料来源', content: '当前登录会话' },
  { label: '更多资料', content: '尚未接入个人资料接口' },
])

const accountLevel = ref(4)

// 安全设置
const security = reactive({
  twoFactor: false,
  loginAlert: true,
  remoteProtect: false,
})
const signature = ref('')
const phone = ref('')
const bindCode = ref('')
const twoFactorPending = ref(false)
const twoFactorLoading = ref(false)
const twoFactorReady = ref(false)
const twoFactorError = ref('')
const bindError = ref('')
const bindRef = ref<{ focus: () => void } | null>(null)
const securityRef = ref<HTMLElement | null>(null)
let twoFactorRequest: AbortController | null = null
onBeforeUnmount(() => twoFactorRequest?.abort())
const focusTwoFactor = () => void nextTick(() => {
  securityRef.value?.querySelector<HTMLButtonElement>('[role="switch"][aria-label="两步验证"]')?.focus()
})

async function loadTwoFactor() {
  if (twoFactorRequest && !twoFactorRequest.signal.aborted) return
  const request = new AbortController()
  twoFactorRequest = request
  twoFactorLoading.value = true
  twoFactorError.value = ''
  try {
    const payload = await fetchTwoFactorStatus(request.signal)
    if (request.signal.aborted) return
    if (typeof payload?.data?.enabled !== 'boolean') throw new Error('两步验证状态响应不完整，请重试')
    security.twoFactor = payload.data.enabled
    twoFactorReady.value = true
  } catch (error: unknown) {
    if (!request.signal.aborted) {
      twoFactorReady.value = false
      twoFactorError.value = error instanceof Error ? error.message : '两步验证状态加载失败'
    }
  } finally {
    if (twoFactorRequest === request && !request.signal.aborted) {
      twoFactorRequest = null
      twoFactorLoading.value = false
    }
  }
}

function cancelTwoFactorBind() {
  twoFactorPending.value = false
  bindCode.value = ''
  bindError.value = ''
  focusTwoFactor()
}

async function saveTwoFactor(enabled: boolean) {
  if (!twoFactorReady.value || twoFactorRequest) return
  const request = new AbortController()
  twoFactorRequest = request
  twoFactorLoading.value = true
  twoFactorError.value = ''
  try {
    const payload = await updateTwoFactorEnabled(enabled, request.signal)
    if (request.signal.aborted) return
    if (typeof payload?.data?.enabled !== 'boolean') throw new Error('两步验证状态响应不完整，请重新读取')
    security.twoFactor = payload.data.enabled
    cancelTwoFactorBind()
    Message.success({ content: payload.data.enabled ? '两步验证已开启' : '两步验证已关闭', duration: 2000 })
  } catch (error: unknown) {
    if (!request.signal.aborted) twoFactorError.value = error instanceof Error ? error.message : '两步验证保存失败，请重试'
  } finally {
    if (twoFactorRequest === request && !request.signal.aborted) {
      twoFactorRequest = null
      twoFactorLoading.value = false
    }
  }
}

function handleTwoFactorChange(enabled: boolean) {
  if (!twoFactorReady.value || twoFactorLoading.value) return
  if (enabled) {
    twoFactorPending.value = true
    bindCode.value = ''
    bindError.value = ''
  } else if (twoFactorPending.value) cancelTwoFactorBind()
  else void saveTwoFactor(false)
}

function confirmTwoFactorBind() {
  if (bindCode.value !== DEMO_OTP_CODE) {
    bindError.value = '验证码错误，请输入演示验证码 123456'
    bindRef.value?.focus()
    return
  }
  void saveTwoFactor(true)
}

onMounted(() => { void loadTwoFactor() })

// 偏好
const density = ref<string>('comfortable')
const themeColor = ref<string>('#3b82f6')
const fontSize = ref<number>(14)
const birthday = ref<DatePickerModelValue>(null)
const quietHours = ref<TimePickerModelValue>(['22:00', '07:00'])
const bio = ref('')
const emailDigest = ref(true)
const swatchColors = ['#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f97316', '#14b8a6']
const fontMarks: Record<number, string> = { 12: '小', 16: '中', 20: '大' }

// 登录设备
const devices = ref<ListItem[]>([
  { key: 'd1', title: 'MacBook Pro · Chrome', description: '上海 · 示例设备 · 192.168.1.20' },
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
  birthday.value = value as DatePickerModelValue
}
function handleQuietHoursChange(value: TimePickerModelValue) {
  quietHours.value = value
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
      ]"
    />

    <Tabs :active-key="activeTab" @update:active-key="handleTabChange">
      <!-- 基本资料 -->
      <TabPane tab-key="basic" label="基本资料">
        <div class="space-y-6">
          <MutedPanel description="用户名来自当前会话；活跃度、登录次数、积分与在线天数为组件示例，不代表当前账号统计。" />
          <Card>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-4">
                <Badge type="dot" variant="success" :standalone="false">
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
                    <Tag variant="primary" size="sm">已登录账号</Tag>
                    <Text size="sm" color="secondary">当前会话</Text>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Text size="sm" color="secondary">示例活跃度</Text>
                <Rate :model-value="accountLevel" disabled allow-half />
              </div>
            </div>
          </Card>

          <Row :gutter="[16, 16]">
            <Col :span="{ xs: 24, sm: 8 }">
              <Card><Statistic title="示例登录次数" :value="1280" group-separator /></Card>
            </Col>
            <Col :span="{ xs: 24, sm: 8 }">
              <Card><Statistic title="示例积分" :value="4860" suffix="分" /></Card>
            </Col>
            <Col :span="{ xs: 24, sm: 8 }">
              <Card><Statistic title="示例连续在线" :value="36" suffix="天" /></Card>
            </Col>
          </Row>

          <Card title="资料详情">
            <Descriptions :items="basicItems" :column="{ xs: 1, sm: 2, lg: 3 }" bordered colon />
          </Card>
        </div>
      </TabPane>

      <!-- 安全设置 -->
      <TabPane tab-key="security" label="安全设置">
        <div ref="securityRef" class="space-y-6">
          <Alert v-if="twoFactorError" type="error" :title="twoFactorError" show-icon>
            <template #action><Button size="sm" variant="outline" :loading="twoFactorLoading" @click="loadTwoFactor">重新读取状态</Button></template>
          </Alert>
          <Card title="安全选项">
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-4 py-2">
                <div class="min-w-0">
                  <Text weight="medium">两步验证</Text>
                  <Text size="sm" color="secondary" class="block">{{ twoFactorLoading ? '正在读取或保存两步验证状态…' : !twoFactorReady ? '状态尚未读取，请重试' : twoFactorPending ? '待确认启用，尚未保存' : '使用固定演示验证码，开关写入当前账号' }}</Text>
                </div>
                <Switch
                  aria-label="两步验证"
                  :model-value="security.twoFactor || twoFactorPending"
                  :disabled="!twoFactorReady || twoFactorLoading"
                  @update:model-value="handleTwoFactorChange"
                />
              </div>
              <Divider spacing="sm" />
              <div class="flex items-center justify-between gap-4 py-2">
                <div class="min-w-0">
                  <Text weight="medium">登录提醒</Text>
                  <Text size="sm" color="secondary" class="block">演示开关，尚未接入邮件通知</Text>
                </div>
                <Switch v-model="security.loginAlert" aria-label="登录提醒" />
              </div>
              <Divider spacing="sm" />
              <div class="flex items-center justify-between gap-4 py-2">
                <div class="min-w-0">
                  <Text weight="medium">异地登录保护</Text>
                  <Text size="sm" color="secondary" class="block">演示开关，不执行异地登录拦截</Text>
                </div>
                <Switch v-model="security.remoteProtect" aria-label="异地登录保护" />
              </div>
            </div>
          </Card>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card v-if="twoFactorPending" title="确认启用两步验证">
              <div class="flex flex-col items-center gap-3">
                <MutedPanel description="演示验证码固定 123456；确认会写入当前账号，两步验证在下次登录时生效。" />
                <div data-testid="profile-2fa-otp">
                  <InputOTP
                    ref="bindRef"
                    auto-focus
                    :disabled="twoFactorLoading"
                    :status="bindError ? 'error' : undefined"
                    :error-message="bindError"
                    :model-value="bindCode"
                    @update:model-value="(value: string) => { bindCode = value; bindError = '' }"
                    @keydown.enter.prevent="confirmTwoFactorBind"
                    :length="OTP_LENGTH"
                    type="numeric"
                    aria-label="两步验证绑定码"
                  />
                </div>
                <Button
                  :loading="twoFactorLoading"
                  :disabled="bindCode.length !== OTP_LENGTH"
                  @click="confirmTwoFactorBind"
                >
                  确认启用
                </Button>
                <Button variant="outline" :disabled="twoFactorLoading" @click="cancelTwoFactorBind">取消启用</Button>
              </div>
            </Card>
            <Card title="手机号（演示）">
              <MaskInput v-model="phone" :mask="PHONE_MASK" placeholder="请输入手机号" />
              <Text size="sm" color="secondary" class="mt-2 block">仅用于演示掩码输入，本期不持久化。</Text>
            </Card>

            <Card title="电子签名（演示）">
              <Signature v-model="signature" :height="160" clearable clear-text="清除" />
              <Text size="sm" color="secondary" class="mt-2 block">签名仅在当前页预览，尚未接入保存接口。</Text>
            </Card>
          </div>
        </div>
      </TabPane>

      <!-- 偏好 -->
      <TabPane tab-key="preference" label="偏好">
        <Card title="界面与通知偏好（演示）">
          <MutedPanel class="mb-6" description="以下控件仅在当前个人中心页面预览，离开后重置；不修改全站主题，也不发送邮件。全站外观请使用右上角主题配置。" />
          <div class="space-y-6">
            <div>
              <Text weight="medium" class="mb-2 block">界面密度</Text>
              <RadioGroup :model-value="density" @update:model-value="handleDensityChange">
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
                  :model-value="fontSize"
                  @update:model-value="handleFontSizeChange"
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
                <Text size="sm" color="secondary" class="block">演示开关，尚未接入邮件发送</Text>
              </div>
              <Switch v-model="emailDigest" aria-label="邮件摘要" />
            </div>

          </div>
        </Card>
      </TabPane>

      <!-- 登录设备 -->
      <TabPane tab-key="devices" label="登录设备">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MutedPanel class="lg:col-span-2" description="以下设备与历史为静态示例；尚未接入设备查询或下线接口，不代表真实登录状态。" />
          <Card>
            <template #header>
              <div class="flex items-center gap-2">
                <Text weight="bold">当前登录设备（示例）</Text>
                <Badge :content="devices.length" variant="primary" standalone />
              </div>
            </template>
            <List :data-source="devices" bordered />
          </Card>

          <Card title="登录历史（示例）">
            <Timeline :items="loginHistory" />
          </Card>
        </div>
      </TabPane>
    </Tabs>
  </div>
</template>
