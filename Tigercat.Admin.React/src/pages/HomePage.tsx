import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
import { usePermission } from '../utils/permission';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Card } from '@expcat/tigercat-react/Card';
import { Loading } from '@expcat/tigercat-react/Loading';
import { Message } from '@expcat/tigercat-react/Message';
import { Select } from '@expcat/tigercat-react/Select';
import { Text } from '@expcat/tigercat-react/Text';
import { PageHeader } from '../components/PageHeader';
import { LineChart, BarChart, PieChart } from '../utils/lazyTigercat';
import { Marquee } from '@expcat/tigercat-react/Marquee';
import { DataExport } from '@expcat/tigercat-react/DataExport';
import { Row } from '@expcat/tigercat-react/Row';
import { Col } from '@expcat/tigercat-react/Col';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  ShieldIcon,
  SettingsIcon,
  FileTextIcon,
  DashboardIcon,
  ActivityIcon,
  ShieldCheckIcon,
  PackageIcon,
  ZapIcon,
  CalendarIcon,
  GlobeIcon,
} from '../components/Icons';
import {
  ChartEmptyState,
  MetricCard,
  MetricGrid,
} from '../components/PageFragments';
import type { StatsOverview, StatsTrend } from '../utils';
import { apiRequest, getAuthHeaders } from '../utils';
import {
  DATA_EXPORT_TRIGGER_FORMATS,
  EXPORT_FORMAT_LABELS,
  EXPORT_FORMATS,
  OVERVIEW_EXPORT_FIELDS,
  exportOverview,
  toExportColumns,
  type ExportFormat,
} from '../utils/export';

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

interface HomePageContext {
  notice: Notice;
  homeMessage: string;
  homeError: string;
  username?: string;
}

const trendDaysOptions = [
  { value: 7, label: '近 7 天' },
  { value: 14, label: '近 14 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
];

// 统计卡片配置
const statsCardsMeta = [
  {
    key: 'totalUsers',
    label: '总用户数',
    icon: UsersIcon,
  },
  {
    key: 'activeUsers',
    label: '活跃用户',
    icon: ActivityIcon,
  },
  {
    key: 'totalRoles',
    label: '总角色数',
    icon: ShieldIcon,
  },
  {
    key: 'totalPermissions',
    label: '总权限数',
    icon: ShieldCheckIcon,
  },
] as const;

// 快捷操作
const ANNOUNCEMENTS = [
  '今晚 22:00–23:00 计划维护，仪表盘指标可能延迟刷新。',
  '每日 02:00 自动备份已完成，可在审计日志核对结果。',
  '媒体存储用量接近 80%，请及时清理过期文件。',
  '演示环境将于本周日重启缓存节点，会话可能被重置。',
];

const quickActions = [
  {
    label: '用户管理',
    icon: UsersIcon,
    key: 'users',
    colorClasses: '',
    iconClass: 'text-(--tiger-primary,#3b82f6)',
  },
  {
    label: '角色配置',
    icon: ShieldIcon,
    key: 'roles',
    colorClasses: '',
    iconClass: 'text-(--tiger-primary,#3b82f6)',
  },
  {
    label: '系统设置',
    icon: SettingsIcon,
    key: 'settings',
    colorClasses: '',
    iconClass: 'text-(--tiger-primary,#3b82f6)',
  },
  {
    label: '查看日志',
    icon: FileTextIcon,
    key: 'logs',
    colorClasses: '',
    iconClass: 'text-(--tiger-primary,#3b82f6)',
  },
];

function HomePage() {
  const navigate = useNavigate();
  const { has: hasPerm } = usePermission();
  const { notice, homeMessage, homeError, username } =
    useOutletContext<HomePageContext>();

  // --- 统计数据状态 ---
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [trend, setTrend] = useState<StatsTrend | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState('');
  const [reload, setReload] = useState(0);
  const [statsError, setStatsError] = useState('');
  const [trendDays, setTrendDays] = useState<number>(7);
  const [isNarrowTrend, setIsNarrowTrend] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportColumns = useMemo(() => toExportColumns(OVERVIEW_EXPORT_FIELDS), []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const syncNarrowTrend = () => setIsNarrowTrend(query.matches);
    syncNarrowTrend();
    query.addEventListener('change', syncNarrowTrend);
    return () => query.removeEventListener('change', syncNarrowTrend);
  }, []);

  // --- 快捷操作跳转 ---
  const handleQuickAction = useCallback((key: string) => {
    if (key === 'users') navigate('/users');
    else if (key === 'roles') navigate('/roles');
    else if (key === 'settings') navigate('/settings');
    else if (key === 'logs') navigate('/audit-logs');
  }, [navigate]);

  // --- 统计卡片（基于真实概览数据） ---
  const statsCards = useMemo(() => {
    const o = overview;
    return statsCardsMeta.map((meta) => ({
      ...meta,
      value: o ? String(o[meta.key]) : '-',
    }));
  }, [overview]);

  // --- 图表数据 ---
  const trendChartData = useMemo(() => {
    if (!trend) return [];
    return trend.points.map((p) => ({ x: p.date, y: p.count }));
  }, [trend]);

  const distributionChartData = useMemo(() => {
    if (!overview || overview.totalUsers === 0) return [];
    return [
      { value: overview.activeUsers, label: '启用' },
      { value: overview.disabledUsers, label: '停用' },
    ];
  }, [overview]);

  const chartPrimary = 'var(--tiger-primary)';
  const chartError = 'var(--tiger-error, #dc2626)';
  const chartSuccess = 'var(--tiger-success, #16a34a)';
  const chartWarning = 'var(--tiger-warning, #d97706)';
  const chartInfo = 'var(--tiger-info, #3b82f6)';
  const trendXTicks = isNarrowTrend ? 3 : trendDays <= 14 ? Math.min(trendDays, 8) : 6;

  const barChartData = useMemo(() => {
    if (!overview) return [];
    return [
      { x: '总用户', y: overview.totalUsers, color: chartPrimary },
      { x: '活跃', y: overview.activeUsers, color: chartSuccess },
      { x: '禁用', y: overview.disabledUsers, color: chartError },
      { x: '角色', y: overview.totalRoles, color: chartInfo },
      { x: '权限', y: overview.totalPermissions, color: chartWarning },
    ];
  }, [overview, chartPrimary, chartError, chartSuccess, chartWarning, chartInfo]);

  useEffect(() => {
    const controller = new AbortController();
    setStatsLoading(true);
    setStatsError('');
    setOverview(null);
    void apiRequest<StatsOverview>('/api/stats/overview', { headers: getAuthHeaders(), signal: controller.signal })
      .then((res) => { if (!controller.signal.aborted) setOverview(res.data); })
      .catch((error) => { if (!controller.signal.aborted) setStatsError(error instanceof Error ? error.message : '加载统计数据失败'); })
      .finally(() => { if (!controller.signal.aborted) setStatsLoading(false); });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    setTrendLoading(true);
    setTrendError('');
    setTrend(null);
    void apiRequest<StatsTrend>(`/api/stats/trend?days=${trendDays}`, { headers: getAuthHeaders(), signal: controller.signal })
      .then((res) => { if (!controller.signal.aborted) setTrend(res.data); })
      .catch((error) => { if (!controller.signal.aborted) setTrendError(error instanceof Error ? error.message : '加载趋势数据失败'); })
      .finally(() => { if (!controller.signal.aborted) setTrendLoading(false); });
    return () => controller.abort();
  }, [trendDays, reload]);

  const handleTrendDaysChange = (value: number | string | undefined) => {
    const days = Number(value);
    if (trendDaysOptions.some((option) => option.value === days)) setTrendDays(days);
  };

  const onExport = useCallback(async (format: ExportFormat) => {
    setExporting(true);
    try {
      await exportOverview({
        format,
        days: trendDays,
        headers: getAuthHeaders(),
      });
      Message.success({ content: '导出成功', duration: 3000 });
    } catch (error: unknown) {
      Message.error({ content: error instanceof Error ? error.message : '导出失败', duration: 3000 });
    } finally {
      setExporting(false);
    }
  }, [trendDays]);

  const errorMessage = homeError || statsError || trendError;

  return (
    <div className="space-y-6">
      {/* 通知提示 */}
      {notice?.message && (
        <Alert
          type={notice.type || 'info'}
          title={notice.type === 'error' ? '操作失败' : '操作成功'}
          description={notice.message}
          closable
        />
      )}

      <PageHeader
        icon={<DashboardIcon size={24} />}
        title={`欢迎回来，${username || 'Admin'}！`}
        subtitle={homeMessage || '今天是个好日子，让我们开始工作吧！'}
        tags={[
          { label: '当前账号', variant: 'primary' },
          { label: '已认证', variant: 'success' },
        ]}
      />

      {/* 加载错误提示 */}
      {errorMessage && (
        <Alert
          type="error"
          title="数据加载失败"
          description={errorMessage}
          closable
        />
      )}

      {(statsError || trendError) && <Button variant="outline" onClick={() => setReload((value) => value + 1)}>重试统计</Button>}

      <Marquee
        direction="start"
        duration={28000}
        pauseOnHover
        gap={24}
        repeat={2}
        aria-label="运维公告示例"
        className="rounded-lg border border-(--tiger-border,#e5e7eb)/30 bg-(--tiger-bg-card,#ffffff) px-3 py-2">
        {ANNOUNCEMENTS.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-(--tiger-text,#0f172a)">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tiger-primary,#3b82f6)" />
            <span className="text-(--tiger-text-secondary,#64748b)">示例：{item}</span>
          </span>
        ))}
      </Marquee>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {EXPORT_FORMATS.map((format) => (
          <DataExport
            key={format}
            columns={exportColumns}
            dataSource={[]}
            formats={DATA_EXPORT_TRIGGER_FORMATS}
            fileName="overview"
            labels={{
              xlsxText: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
              exportingText: '导出中...',
              triggerAriaLabel: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
            }}
            disabled={exporting || statsLoading || trendLoading || !!statsError || !!trendError}
            customExport={() => onExport(format)}
          />
        ))}
      </div>

      <MetricGrid columns={4}>
        {statsCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <MetricCard
              key={stat.label}
              title={stat.label}
              value={stat.value}
              loading={statsLoading}
              icon={<IconComponent size={20} />}
            />
          );
        })}
      </MetricGrid>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户创建趋势（折线图） */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text size="base" weight="bold">
              用户创建趋势
            </Text>
            <div className="w-full sm:w-36">
              <Select
                value={trendDays}
                options={trendDaysOptions}
                size="sm"
                clearable={false}
                onChange={handleTrendDaysChange}
              />
            </div>
          </div>
          {statsLoading || trendLoading ? (
            <div className="flex items-center justify-center h-52">
              <Loading />
            </div>
          ) : trendChartData.length ? (
            <LineChart
              data={trendChartData}
              height={220}
              responsive
              showArea={true}
              areaOpacity={0.15}
              showPoints={true}
              pointSize={4}
              includeZero={true}
              lineColor={chartPrimary}
              animated={true}
              xAxisLabel="日期"
              yAxisLabel="新增用户"
              xTicks={trendXTicks}
              xTickFormat={(v) => String(v).slice(5)}
              strokeGradient={true}
              pointGradient={true}
            />
          ) : (
            <ChartEmptyState description="暂无趋势数据" />
          )}
        </Card>

        {/* 用户状态分布（饼图） */}
        <Card header={<Text size="base" weight="bold">用户状态分布</Text>} className="lg:col-span-1 overflow-visible">
          {statsLoading ? (
            <div className="flex items-center justify-center h-52">
              <Loading />
            </div>
          ) : distributionChartData.length ? (
            <PieChart
              data={distributionChartData}
              height={220}
              colors={[chartPrimary, chartError]}
              showLabels={true}
              labelPosition="inside"
              showLegend={true}
              legendPosition="bottom"
              shadow={true}
              gradient={true}
            />
          ) : (
            <ChartEmptyState description="暂无分布数据" />
          )}
        </Card>
      </div>

      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <Card header={<Text size="base" weight="bold">快捷操作</Text>} className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.filter((action) => action.key === 'users' ? hasPerm('user:view') : action.key === 'roles' ? hasPerm('role:view') : action.key === 'logs' ? hasPerm('audit:view') : true).map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action.key)}
                  className={`p2-action-tile group flex min-h-24 flex-col items-center justify-center p-4 transition-all duration-300 hover:shadow-md ${action.colorClasses}`}>
                  <div className="mb-2 transition-transform group-hover:scale-110">
                    <IconComponent size={24} className={action.iconClass} />
                  </div>
                  <Text size="sm" weight="medium">
                    {action.label}
                  </Text>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 概览详情（柱状图） */}
        <Card header={<Text size="base" weight="bold">用户概览</Text>} className="lg:col-span-2">
          {statsLoading ? (
            <div className="flex items-center justify-center h-52">
              <Loading />
            </div>
          ) : barChartData.length ? (
            <BarChart
              data={barChartData}
              height={220}
              responsive
              showGrid={true}
              animated={true}
              barRadius={6}
              yAxisLabel="数量"
              gradient={true}
            />
          ) : (
            <ChartEmptyState description="暂无概览数据" />
          )}
        </Card>
      </div>

      {/* 系统信息 */}
      <Card header={<Text size="base" weight="bold">系统信息</Text>}>
        <Row gutter={[16, 16]}>
          <Col span={{ xs: 24, sm: 12, lg: 6 }}>
            <MetricCard
              framed={false}
              title="系统版本"
              value="v1.0.0"
              icon={<PackageIcon size={20} />}
            />
          </Col>
          <Col span={{ xs: 24, sm: 12, lg: 6 }}>
            <MetricCard
              framed={false}
              title="运行环境"
              value=".NET 10 + React 19"
              icon={<ZapIcon size={20} />}
            />
          </Col>
          <Col span={{ xs: 24, sm: 12, lg: 6 }}>
            <MetricCard
              framed={false}
              title="最后更新"
              value="2026-01-28"
              icon={<CalendarIcon size={20} />}
            />
          </Col>
          <Col span={{ xs: 24, sm: 12, lg: 6 }}>
            <MetricCard
              framed={false}
              title="API 状态"
              value={statsLoading || trendLoading ? '检查中' : statsError || trendError ? '请求失败' : '在线'}
              icon={<GlobeIcon size={20} />}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default HomePage;
