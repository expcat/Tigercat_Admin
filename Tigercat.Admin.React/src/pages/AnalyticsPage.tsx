import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Message } from '@expcat/tigercat-react';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { ButtonGroup } from '@expcat/tigercat-react/ButtonGroup';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Table } from '@expcat/tigercat-react/Table';
import { Skeleton } from '@expcat/tigercat-react/Skeleton';
import { DatePicker } from '@expcat/tigercat-react/DatePicker';
import { AreaChart } from '@expcat/tigercat-react/AreaChart';
import { DonutChart } from '@expcat/tigercat-react/DonutChart';
import { FunnelChart } from '@expcat/tigercat-react/FunnelChart';
import { GaugeChart } from '@expcat/tigercat-react/GaugeChart';
import { HeatmapChart } from '@expcat/tigercat-react/HeatmapChart';
import { RadarChart } from '@expcat/tigercat-react/RadarChart';
import { ScatterChart } from '@expcat/tigercat-react/ScatterChart';
import { TreeMapChart } from '@expcat/tigercat-react/TreeMapChart';
import { SunburstChart } from '@expcat/tigercat-react/SunburstChart';
import { OrgChart } from '@expcat/tigercat-react/OrgChart';
import { ChartCanvas } from '@expcat/tigercat-react/ChartCanvas';
import { ChartAxis } from '@expcat/tigercat-react/ChartAxis';
import { ChartGrid } from '@expcat/tigercat-react/ChartGrid';
import { ChartSeries } from '@expcat/tigercat-react/ChartSeries';
import { ChartLegend } from '@expcat/tigercat-react/ChartLegend';
import { ChartTooltip } from '@expcat/tigercat-react/ChartTooltip';
import { createLinearScale, createBandScale } from '@expcat/tigercat-core';
import type {
  SegmentedOption,
  AreaChartDatum,
  DonutChartDatum,
  FunnelChartDatum,
  RadarChartDatum,
  ScatterChartDatum,
  HeatmapChartDatum,
  TreeMapChartDatum,
  SunburstChartDatum,
  OrgChartNode,
  ChartSeriesPoint,
  ChartLegendItem,
  TableColumn,
  DatePickerRangeModelValue,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { TrendingUpIcon } from '../components/Icons';

const rangeOptions: SegmentedOption[] = [
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' },
  { value: '90', label: '近 90 天' },
];

const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
const baseTrend = [120, 200, 150, 260, 300, 260];

const radarData: RadarChartDatum[] = [
  { label: '性能', value: 80 },
  { label: '可用性', value: 90 },
  { label: '体验', value: 70 },
  { label: '安全', value: 85 },
  { label: '生态', value: 60 },
];

const scatterData: ScatterChartDatum[] = [
  { x: 12, y: 22, size: 8 },
  { x: 28, y: 46, size: 12 },
  { x: 42, y: 30, size: 10 },
  { x: 55, y: 68, size: 16 },
  { x: 70, y: 50, size: 9 },
  { x: 84, y: 78, size: 14 },
];

const heatmapX = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const heatmapY = ['00:00', '06:00', '12:00', '18:00'];

const orgData: OrgChartNode = {
  id: 'root',
  label: '总部',
  title: 'CEO',
  children: [
    {
      id: 'tech',
      label: '技术中心',
      title: 'CTO',
      children: [
        { id: 'fe', label: '前端组' },
        { id: 'be', label: '后端组' },
      ],
    },
    {
      id: 'ops',
      label: '运营中心',
      title: 'COO',
      children: [
        { id: 'mkt', label: '市场组' },
        { id: 'sup', label: '客服组' },
      ],
    },
  ],
};

const baseChannels = [
  { name: '直接访问', visits: 38400, orders: 920, conversion: 2.4, trend: '上升' },
  { name: '搜索引擎', visits: 31200, orders: 760, conversion: 2.1, trend: '上升' },
  { name: '社交媒体', visits: 24800, orders: 540, conversion: 1.8, trend: '持平' },
  { name: '邮件营销', visits: 12600, orders: 410, conversion: 3.2, trend: '上升' },
  { name: '付费广告', visits: 18900, orders: 620, conversion: 2.9, trend: '下降' },
  { name: '内容推荐', visits: 9800, orders: 280, conversion: 2.0, trend: '持平' },
  { name: '合作渠道', visits: 7400, orders: 190, conversion: 1.6, trend: '上升' },
  { name: '线下活动', visits: 4200, orders: 130, conversion: 2.7, trend: '下降' },
];
const tableColumns: TableColumn[] = [
  { key: 'channel', title: '渠道' },
  { key: 'visits', title: '访问量', align: 'right' },
  { key: 'orders', title: '订单数', align: 'right' },
  { key: 'conversion', title: '转化率', align: 'right' },
  { key: 'trend', title: '趋势' },
];

const legendItems: ChartLegendItem[] = [{ index: 0, label: '月度转化', color: '#3b82f6' }];

const CANVAS_W = 560;
const CANVAS_H = 240;
const CANVAS_PAD = 32;
const innerW = CANVAS_W - CANVAS_PAD * 2;
const innerH = CANVAS_H - CANVAS_PAD * 2;
const customLabels = ['1月', '2月', '3月', '4月', '5月', '6月'];

const PAGE_SIZE = 5;

function AnalyticsPage() {
  const [range, setRange] = useState<string | number>('30');
  const [dateRange, setDateRange] = useState<DatePickerRangeModelValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  const triggerLoading = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 420);
  };

  const factor = useMemo(() => {
    const v = String(range);
    return v === '7' ? 0.4 : v === '90' ? 2.2 : 1;
  }, [range]);

  const handleRangeChange = (value: string | number) => {
    setRange(value);
    setPage(1);
    triggerLoading();
  };
  const handleRefresh = () => {
    setPage(1);
    triggerLoading();
  };
  const handleExport = () => {
    Message.success({ content: '报表已导出（演示）', duration: 2400 });
  };

  const kpis = useMemo(
    () => [
      { label: '访问量', value: Math.round(128400 * factor), suffix: '', percentage: 72 },
      { label: '转化率', value: 3.8, suffix: '%', percentage: 38 },
      { label: '订单数', value: Math.round(2360 * factor), suffix: '', percentage: 64 },
      { label: '收入', value: Math.round(486000 * factor), suffix: '元', percentage: 81 },
    ],
    [factor],
  );

  const areaData: AreaChartDatum[] = useMemo(
    () => months.map((m, i) => ({ x: m, y: Math.round(baseTrend[i] * factor) })),
    [factor],
  );

  const donutData: DonutChartDatum[] = useMemo(
    () => [
      { value: Math.round(42 * factor), label: '直接访问' },
      { value: Math.round(28 * factor), label: '搜索引擎' },
      { value: Math.round(18 * factor), label: '社交媒体' },
      { value: Math.round(12 * factor), label: '推荐' },
    ],
    [factor],
  );
  const donutTotal = useMemo(() => donutData.reduce((sum, d) => sum + d.value, 0), [donutData]);

  const funnelData: FunnelChartDatum[] = useMemo(
    () => [
      { label: '曝光', value: Math.round(1000 * factor) },
      { label: '点击', value: Math.round(620 * factor) },
      { label: '加购', value: Math.round(340 * factor) },
      { label: '下单', value: Math.round(180 * factor) },
      { label: '支付', value: Math.round(120 * factor) },
    ],
    [factor],
  );

  const gaugeValue = useMemo(
    () => Math.min(100, Math.round(68 * (factor > 1 ? 1.1 : factor < 1 ? 0.8 : 1))),
    [factor],
  );

  const heatmapData: HeatmapChartDatum[] = useMemo(() => {
    const out: HeatmapChartDatum[] = [];
    heatmapY.forEach((y, yi) => {
      heatmapX.forEach((x, xi) => {
        out.push({ x, y, value: Math.round((((xi * 7 + yi * 13 + 20) % 90) + 5) * factor) });
      });
    });
    return out;
  }, [factor]);

  const treeMapData: TreeMapChartDatum[] = useMemo(
    () => [
      { label: '华东', value: Math.round(380 * factor) },
      { label: '华北', value: Math.round(260 * factor) },
      { label: '华南', value: Math.round(220 * factor) },
      { label: '西部', value: Math.round(140 * factor) },
    ],
    [factor],
  );

  const sunburstData: SunburstChartDatum[] = useMemo(
    () => [
      {
        label: '线上',
        value: Math.round(400 * factor),
        children: [
          { label: 'App', value: Math.round(220 * factor) },
          { label: 'Web', value: Math.round(180 * factor) },
        ],
      },
      {
        label: '线下',
        value: Math.round(200 * factor),
        children: [
          { label: '门店', value: Math.round(120 * factor) },
          { label: '代理', value: Math.round(80 * factor) },
        ],
      },
    ],
    [factor],
  );

  const customValues = useMemo(() => [30, 52, 41, 67, 58, 72].map((v) => Math.round(v * factor)), [factor]);
  const xScale = useMemo(
    () => createBandScale(customLabels, [0, innerW], { paddingInner: 0.3, paddingOuter: 0.2 }),
    [],
  );
  const yScale = useMemo(() => createLinearScale([0, Math.max(...customValues, 1)], [innerH, 0]), [customValues]);
  const seriesPoints: ChartSeriesPoint[] = useMemo(
    () =>
      customLabels.map((label, i) => ({
        x: (xScale.map(label) ?? 0) + (xScale.bandwidth ?? 0) / 2,
        y: yScale.map(customValues[i]) ?? 0,
        label,
        value: customValues[i],
      })),
    [xScale, yScale, customValues],
  );

  const allRows = useMemo<Record<string, unknown>[]>(
    () =>
      baseChannels.map((c) => ({
        channel: c.name,
        visits: Math.round(c.visits * factor).toLocaleString(),
        orders: Math.round(c.orders * factor).toLocaleString(),
        conversion: `${c.conversion}%`,
        trend: c.trend,
      })),
    [factor],
  );
  const pagedRows = useMemo(
    () => allRows.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE),
    [allRows, page],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<TrendingUpIcon size={24} />}
        title="数据分析"
        subtitle="一站式 BI 看板，聚合趋势、构成、转化与渠道明细"
        tags={[
          { label: '实时演示', variant: 'success' },
          { label: 'BI', variant: 'primary' },
        ]}
      />

      {/* 工具栏 */}
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented value={range} onChange={handleRangeChange} options={rangeOptions} />
          <div className="flex flex-wrap items-center gap-3">
            <DatePicker range value={dateRange} onChange={(r) => setDateRange(r)} placeholder="自定义区间" clearable />
            <ButtonGroup>
              <Button variant="outline" onClick={handleRefresh}>
                刷新
              </Button>
              <Button variant="outline" onClick={handleExport}>
                导出
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            {loading ? (
              <Skeleton rows={2} />
            ) : (
              <>
                <Statistic title={kpi.label} value={kpi.value} suffix={kpi.suffix} groupSeparator />
                <div className="mt-3">
                  <Progress percentage={kpi.percentage} />
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* 图表网格 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="访问趋势">
          {loading ? <Skeleton rows={4} /> : <AreaChart data={areaData} height={240} />}
        </Card>

        <Card title="流量构成">
          {loading ? (
            <Skeleton rows={4} />
          ) : (
            <DonutChart data={donutData} height={240} centerValue={donutTotal} centerLabel="总访问" showLegend />
          )}
        </Card>

        <Card title="转化漏斗">
          {loading ? <Skeleton rows={4} /> : <FunnelChart data={funnelData} height={240} />}
        </Card>

        <Card title="目标达成率">
          {loading ? <Skeleton rows={4} /> : <GaugeChart value={gaugeValue} min={0} max={100} height={240} />}
        </Card>

        <Card title="能力雷达">
          {loading ? <Skeleton rows={4} /> : <RadarChart data={radarData} height={240} />}
        </Card>

        <Card title="访问分布">
          {loading ? <Skeleton rows={4} /> : <ScatterChart data={scatterData} height={240} />}
        </Card>

        <Card title="活跃热力">
          {loading ? (
            <Skeleton rows={4} />
          ) : (
            <HeatmapChart data={heatmapData} xLabels={heatmapX} yLabels={heatmapY} height={240} />
          )}
        </Card>

        <Card title="区域份额">
          {loading ? <Skeleton rows={4} /> : <TreeMapChart data={treeMapData} height={240} />}
        </Card>

        <Card title="渠道层级构成">
          {loading ? <Skeleton rows={4} /> : <SunburstChart data={sunburstData} height={240} />}
        </Card>

        <Card title="组织 / 渠道分布">
          {loading ? (
            <Skeleton rows={4} />
          ) : (
            <div className="overflow-auto">
              <OrgChart data={orgData} height={240} />
            </div>
          )}
        </Card>
      </div>

      {/* 自定义图表（图表基元组合） */}
      <Card title="自定义图表（图表基元组合）">
        {loading ? (
          <Skeleton rows={4} />
        ) : (
          <>
            <div className="overflow-auto">
              <ChartCanvas width={CANVAS_W} height={CANVAS_H} padding={CANVAS_PAD}>
                <ChartGrid xScale={xScale} yScale={yScale} />
                <ChartAxis orientation="bottom" scale={xScale} />
                <ChartAxis orientation="left" scale={yScale} />
                <ChartSeries data={seriesPoints} type="line" color="#3b82f6" />
                <ChartTooltip content="月度转化趋势" visible={false} />
              </ChartCanvas>
            </div>
            <ChartLegend items={legendItems} className="mt-2" />
          </>
        )}
      </Card>

      {/* 明细表 */}
      <Card title="渠道明细">
        {loading ? (
          <Skeleton rows={6} />
        ) : (
          <>
            <Table columns={tableColumns} dataSource={pagedRows} pagination={false} striped />
            <div className="mt-4 flex justify-end">
              <Pagination current={page} total={allRows.length} pageSize={PAGE_SIZE} onChange={(c) => setPage(c)} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default AnalyticsPage;
