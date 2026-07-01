<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Text, Button, Statistic, Message } from '@expcat/tigercat-vue'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { PrintLayout, PrintPageBreak } from '@expcat/tigercat-vue/PrintLayout'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Watermark } from '@expcat/tigercat-vue/Watermark'
import { QRCode } from '@expcat/tigercat-vue/QRCode'
import { Result } from '@expcat/tigercat-vue/Result'
import { Divider } from '@expcat/tigercat-vue/Divider'
import type { SegmentedOption, DescriptionsItem } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'

type ReportType = 'daily' | 'weekly' | 'monthly'

interface ReportMeta {
  title: string
  period: string
  watermark: string
}

const REPORT_OPTIONS: SegmentedOption[] = [
  { value: 'daily', label: '运营日报' },
  { value: 'weekly', label: '销售周报' },
  { value: 'monthly', label: '财务月报' },
]

const REPORT_META: Record<ReportType, ReportMeta> = {
  daily: { title: '运营日报', period: '2026-07-01', watermark: '运营日报 · 演示' },
  weekly: { title: '销售周报', period: '2026-06-25 ~ 2026-07-01', watermark: '销售周报 · 演示' },
  monthly: { title: '财务月报', period: '2026-06', watermark: '财务月报 · 演示' },
}

interface KpiRow {
  label: string
  value: number
  suffix?: string
}

const KPIS: Record<ReportType, KpiRow[]> = {
  daily: [
    { label: '访问量', value: 18420 },
    { label: '订单数', value: 642 },
    { label: '转化率', value: 3.5, suffix: '%' },
    { label: '收入', value: 128600, suffix: ' 元' },
  ],
  weekly: [
    { label: '访问量', value: 126800 },
    { label: '订单数', value: 4380 },
    { label: '转化率', value: 3.4, suffix: '%' },
    { label: '收入', value: 892400, suffix: ' 元' },
  ],
  monthly: [
    { label: '访问量', value: 542000 },
    { label: '订单数', value: 18960 },
    { label: '转化率', value: 3.6, suffix: '%' },
    { label: '收入', value: 3846200, suffix: ' 元' },
  ],
}

interface ChannelRow {
  channel: string
  visits: number
  orders: number
  rate: string
  amount: string
}

const CHANNEL_ROWS: ChannelRow[] = [
  { channel: '自然搜索', visits: 6820, orders: 248, rate: '3.6%', amount: '¥ 48,200' },
  { channel: '付费广告', visits: 5140, orders: 196, rate: '3.8%', amount: '¥ 39,600' },
  { channel: '社交媒体', visits: 3260, orders: 108, rate: '3.3%', amount: '¥ 21,400' },
  { channel: '直接访问', visits: 3200, orders: 90, rate: '2.8%', amount: '¥ 19,400' },
]

const reportType = ref<ReportType>('daily')

const meta = computed(() => REPORT_META[reportType.value])
const kpis = computed(() => KPIS[reportType.value])

const summaryItems = computed<DescriptionsItem[]>(() => [
  { label: '报表编号', content: `RPT-${reportType.value.toUpperCase()}-20260701` },
  { label: '报表类型', content: meta.value.title },
  { label: '统计区间', content: meta.value.period },
  { label: '生成时间', content: '2026-07-01 08:00' },
  { label: '负责人', content: '运营中心 · 演示账户' },
  { label: '数据来源', content: '演示数据集（内存态）' },
])

const qrValue = computed(() => `https://tigercat.demo/reports/RPT-${reportType.value}-20260701`)

function setReportType(value: string | number) {
  reportType.value = value as ReportType
}

function handlePrint() {
  Message.info({ content: '正在调起浏览器打印（可另存为 PDF）', duration: 1800 })
  window.setTimeout(() => window.print(), 300)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="fileText"
      title="报表打印"
      subtitle="A4 打印布局、水印与二维码校验的报表输出工作台"
      :tags="[
        { label: '帮助支持', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <PageActionPanel
      title="报表参数"
      description="选择报表类型后即时预览；点击「打印」按 A4 布局输出，可另存为 PDF。"
    >
      <template #actions>
        <Segmented
          :model-value="reportType"
          :options="REPORT_OPTIONS"
          @update:model-value="setReportType"
        />
        <Button @click="handlePrint">
          <Icon name="download" :size="16" class="mr-1" />
          打印
        </Button>
      </template>
    </PageActionPanel>

    <Card class="overflow-hidden">
      <PrintLayout
        page-size="A4"
        orientation="portrait"
        show-header
        show-footer
        :header-text="`Tigercat 后台 · ${meta.title}`"
        footer-text="本报表由 Tigercat 演示系统生成 · 仅供演示"
        show-page-breaks
      >
        <Watermark :content="meta.watermark">
          <div class="space-y-6 p-2">
            <div>
              <Text size="lg" weight="bold" class="p2-text-primary">{{ meta.title }}</Text>
              <Text size="sm" color="secondary">统计区间 {{ meta.period }}</Text>
            </div>

            <Descriptions :items="summaryItems" :column="{ xs: 1, sm: 2, lg: 3 }" bordered colon />

            <Divider />

            <div>
              <Text weight="bold" class="mb-3 block">关键指标</Text>
              <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div v-for="kpi in kpis" :key="kpi.label" class="p2-soft-surface rounded-lg p-4">
                  <Statistic :title="kpi.label" :value="kpi.value" :suffix="kpi.suffix" group-separator />
                </div>
              </div>
            </div>

            <Divider />

            <div>
              <Text weight="bold" class="mb-3 block">渠道明细</Text>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr class="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
                      <th class="px-3 py-2 font-medium">渠道</th>
                      <th class="px-3 py-2 font-medium text-right">访问量</th>
                      <th class="px-3 py-2 font-medium text-right">订单数</th>
                      <th class="px-3 py-2 font-medium text-right">转化率</th>
                      <th class="px-3 py-2 font-medium text-right">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in CHANNEL_ROWS"
                      :key="row.channel"
                      class="border-b border-(--tiger-border,#e5e7eb)"
                    >
                      <td class="px-3 py-2"><Text weight="medium">{{ row.channel }}</Text></td>
                      <td class="px-3 py-2 text-right">{{ row.visits.toLocaleString() }}</td>
                      <td class="px-3 py-2 text-right">{{ row.orders }}</td>
                      <td class="px-3 py-2 text-right">{{ row.rate }}</td>
                      <td class="px-3 py-2 text-right">{{ row.amount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <PrintPageBreak />

            <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <MutedPanel
                compact
                title="报表校验"
                description="扫描右侧二维码可校验报表来源与完整性（演示链接，不会实际跳转）。"
                class="flex-1"
              />
              <QRCode :value="qrValue" :size="128" />
            </div>

            <Result
              status="success"
              title="报表生成完成"
              :sub-title="`${meta.title} 已就绪，可直接打印或另存为 PDF。`"
            />
          </div>
        </Watermark>
      </PrintLayout>
    </Card>
  </div>
</template>
