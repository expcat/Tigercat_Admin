import { useMemo, useState } from 'react';
import { Card, Text, Button, Statistic, Message } from '@expcat/tigercat-react';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { PrintLayout, PrintPageBreak } from '@expcat/tigercat-react/PrintLayout';
import { Descriptions } from '@expcat/tigercat-react/Descriptions';
import { Watermark } from '@expcat/tigercat-react/Watermark';
import { QRCode } from '@expcat/tigercat-react/QRCode';
import { Result } from '@expcat/tigercat-react/Result';
import { Divider } from '@expcat/tigercat-react/Divider';
import type { SegmentedOption, DescriptionsItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { PageActionPanel, MutedPanel } from '../components/PageFragments';
import { FileTextIcon, DownloadIcon } from '../components/Icons';

type ReportType = 'daily' | 'weekly' | 'monthly';

interface ReportMeta {
  title: string;
  period: string;
  watermark: string;
}

const REPORT_OPTIONS: SegmentedOption[] = [
  { value: 'daily', label: '运营日报' },
  { value: 'weekly', label: '销售周报' },
  { value: 'monthly', label: '财务月报' },
];

const REPORT_META: Record<ReportType, ReportMeta> = {
  daily: { title: '运营日报', period: '2026-07-01', watermark: '运营日报 · 演示' },
  weekly: { title: '销售周报', period: '2026-06-25 ~ 2026-07-01', watermark: '销售周报 · 演示' },
  monthly: { title: '财务月报', period: '2026-06', watermark: '财务月报 · 演示' },
};

interface KpiRow {
  label: string;
  value: number;
  suffix?: string;
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
};

interface ChannelRow {
  channel: string;
  visits: number;
  orders: number;
  rate: string;
  amount: string;
}

const CHANNEL_ROWS: ChannelRow[] = [
  { channel: '自然搜索', visits: 6820, orders: 248, rate: '3.6%', amount: '¥ 48,200' },
  { channel: '付费广告', visits: 5140, orders: 196, rate: '3.8%', amount: '¥ 39,600' },
  { channel: '社交媒体', visits: 3260, orders: 108, rate: '3.3%', amount: '¥ 21,400' },
  { channel: '直接访问', visits: 3200, orders: 90, rate: '2.8%', amount: '¥ 19,400' },
];

function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily');

  const meta = REPORT_META[reportType];
  const kpis = KPIS[reportType];

  const summaryItems: DescriptionsItem[] = useMemo(
    () => [
      { label: '报表编号', content: `RPT-${reportType.toUpperCase()}-20260701` },
      { label: '报表类型', content: meta.title },
      { label: '统计区间', content: meta.period },
      { label: '生成时间', content: '2026-07-01 08:00' },
      { label: '负责人', content: '运营中心 · 演示账户' },
      { label: '数据来源', content: '演示数据集（内存态）' },
    ],
    [reportType, meta],
  );

  const handlePrint = () => {
    Message.info({ content: '正在调起浏览器打印（可另存为 PDF）', duration: 1800 });
    window.setTimeout(() => window.print(), 300);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileTextIcon size={24} />}
        title="报表打印"
        subtitle="A4 打印布局、水印与二维码校验的报表输出工作台"
        tags={[
          { label: '帮助支持', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <PageActionPanel
        title="报表参数"
        description="选择报表类型后即时预览；点击「打印」按 A4 布局输出，可另存为 PDF。"
        actions={
          <>
            <Segmented
              value={reportType}
              options={REPORT_OPTIONS}
              onChange={(value) => setReportType(value as ReportType)}
            />
            <Button onClick={handlePrint}>
              <span className="mr-1 inline-flex align-middle">
                <DownloadIcon size={16} />
              </span>
              打印
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <PrintLayout
          pageSize="A4"
          orientation="portrait"
          showHeader
          showFooter
          headerText={`Tigercat 后台 · ${meta.title}`}
          footerText="本报表由 Tigercat 演示系统生成 · 仅供演示"
          showPageBreaks>
          <Watermark content={meta.watermark}>
            <div className="space-y-6 p-2">
              <div>
                <Text size="lg" weight="bold" className="p2-text-primary">
                  {meta.title}
                </Text>
                <Text size="sm" color="secondary">
                  统计区间 {meta.period}
                </Text>
              </div>

              <Descriptions items={summaryItems} column={{ xs: 1, sm: 2, lg: 3 }} bordered colon />

              <Divider />

              <div>
                <Text weight="bold" className="mb-3 block">
                  关键指标
                </Text>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {kpis.map((kpi) => (
                    <div key={kpi.label} className="p2-soft-surface rounded-lg p-4">
                      <Statistic title={kpi.label} value={kpi.value} suffix={kpi.suffix} groupSeparator />
                    </div>
                  ))}
                </div>
              </div>

              <Divider />

              <div>
                <Text weight="bold" className="mb-3 block">
                  渠道明细
                </Text>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
                        <th className="px-3 py-2 font-medium">渠道</th>
                        <th className="px-3 py-2 font-medium text-right">访问量</th>
                        <th className="px-3 py-2 font-medium text-right">订单数</th>
                        <th className="px-3 py-2 font-medium text-right">转化率</th>
                        <th className="px-3 py-2 font-medium text-right">金额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CHANNEL_ROWS.map((row) => (
                        <tr key={row.channel} className="border-b border-(--tiger-border,#e5e7eb)">
                          <td className="px-3 py-2">
                            <Text weight="medium">{row.channel}</Text>
                          </td>
                          <td className="px-3 py-2 text-right">{row.visits.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{row.orders}</td>
                          <td className="px-3 py-2 text-right">{row.rate}</td>
                          <td className="px-3 py-2 text-right">{row.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <PrintPageBreak />

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                <MutedPanel
                  compact
                  title="报表校验"
                  description="扫描右侧二维码可校验报表来源与完整性（演示链接，不会实际跳转）。"
                  className="flex-1"
                />
                <QRCode value={`https://tigercat.demo/reports/RPT-${reportType}-20260701`} size={128} />
              </div>

              <Result
                status="success"
                title="报表生成完成"
                subTitle={`${meta.title} 已就绪，可直接打印或另存为 PDF。`}
              />
            </div>
          </Watermark>
        </PrintLayout>
      </Card>
    </div>
  );
}

export default ReportsPage;
