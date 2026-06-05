import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Alert,
  Card,
  Text,
  Tag,
  Select,
  Loading,
} from '@expcat/tigercat-react';
import { LineChart } from '@expcat/tigercat-react/LineChart';
import { BarChart } from '@expcat/tigercat-react/BarChart';
import { PieChart } from '@expcat/tigercat-react/PieChart';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  ShieldIcon,
  SettingsIcon,
  FileTextIcon,
  LogoIcon,
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
  const { notice, homeMessage, homeError, username } =
    useOutletContext<HomePageContext>();

  // --- 统计数据状态 ---
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [trend, setTrend] = useState<StatsTrend | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [trendDays, setTrendDays] = useState<number>(7);
  const trendRequestId = useRef(0);

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
    if (!overview) return [];
    return [
      { value: overview.activeUsers, label: 'Active' },
      { value: overview.disabledUsers, label: 'Disabled' },
    ];
  }, [overview]);

  const barChartData = useMemo(() => {
    if (!overview) return [];
    return [
      { x: '总用户', y: overview.totalUsers, color: '#3b82f6' },
      { x: '活跃', y: overview.activeUsers, color: '#22c55e' },
      { x: '禁用', y: overview.disabledUsers, color: '#ef4444' },
      { x: '角色', y: overview.totalRoles, color: '#a855f7' },
      { x: '权限', y: overview.totalPermissions, color: '#f97316' },
    ];
  }, [overview]);

  // --- API 请求 ---
  const fetchOverview = useCallback(async () => {
    const res = await apiRequest<StatsOverview>('/api/stats/overview', {
      headers: getAuthHeaders(),
    });
    setOverview(res.data);
  }, []);

  const fetchTrend = useCallback(async (days: number) => {
    const id = ++trendRequestId.current;
    const res = await apiRequest<StatsTrend>(`/api/stats/trend?days=${days}`, {
      headers: getAuthHeaders(),
    });
    // 仅当此请求仍是最新请求时才更新数据，避免竞态
    if (id === trendRequestId.current) {
      setTrend(res.data);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError('');
      try {
        await Promise.all([fetchOverview(), fetchTrend(trendDays)]);
      } catch (e: any) {
        if (!cancelled) setStatsError(e.message || '加载统计数据失败');
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    loadStats();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换时间范围时重新加载趋势
  const handleTrendDaysChange = useCallback(
    async (value: number | string | undefined) => {
      const days = Number(value);
      if (!days) return;
      setTrendDays(days);
      setTrendLoading(true);
      try {
        await fetchTrend(days);
      } catch (e: any) {
        setStatsError(e.message || '加载趋势数据失败');
      } finally {
        setTrendLoading(false);
      }
    },
    [fetchTrend],
  );

  const errorMessage = homeError || statsError;

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

      {/* 欢迎区域 */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="p2-page-accent absolute inset-0 -m-4" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center shrink-0">
                  <LogoIcon size={48} />
                </div>
                <div className="min-w-0">
                  <Text size="lg" weight="bold" className="p2-text-primary">
                    欢迎回来，{username || 'Admin'}！
                  </Text>
                  <Text size="sm" color="secondary">
                    {homeMessage || '今天是个好日子，让我们开始工作吧！'}
                  </Text>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Tag color="blue" size="sm">
                管理员
              </Tag>
              <Tag color="green" size="sm">
                已认证
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      {/* 加载错误提示 */}
      {errorMessage && (
        <Alert
          type="error"
          title="数据加载失败"
          description={errorMessage}
          closable
        />
      )}

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
              showArea={true}
              areaOpacity={0.15}
              showPoints={true}
              pointSize={4}
              includeZero={true}
              lineColor="#3b82f6"
              animated={true}
              xAxisLabel="日期"
              yAxisLabel="新增用户"
              xTickFormat={(v) => String(v).slice(5)}
              strokeGradient={true}
              pointGradient={true}
            />
          ) : (
            <ChartEmptyState description="暂无趋势数据" />
          )}
        </Card>

        {/* 用户状态分布（饼图） */}
        <Card title="用户状态分布" className="lg:col-span-1">
          {statsLoading ? (
            <div className="flex items-center justify-center h-52">
              <Loading />
            </div>
          ) : distributionChartData.length ? (
            <PieChart
              data={distributionChartData}
              height={220}
              colors={['#3b82f6', '#ef4444']}
              showLabels={true}
              labelPosition="outside"
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
        <Card title="快捷操作" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
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
        <Card title="用户概览" className="lg:col-span-2">
          {statsLoading ? (
            <div className="flex items-center justify-center h-52">
              <Loading />
            </div>
          ) : barChartData.length ? (
            <BarChart
              data={barChartData}
              height={220}
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
      <Card title="系统信息">
        <MetricGrid columns={4}>
          <MetricCard
            framed={false}
            title="系统版本"
            value="v1.0.0"
            icon={<PackageIcon size={20} />}
          />
          <MetricCard
            framed={false}
            title="运行环境"
            value=".NET 10 + React 19"
            icon={<ZapIcon size={20} />}
          />
          <MetricCard
            framed={false}
            title="最后更新"
            value="2026-01-28"
            icon={<CalendarIcon size={20} />}
          />
          <MetricCard
            framed={false}
            title="API 状态"
            value="在线"
            icon={<GlobeIcon size={20} />}
          />
        </MetricGrid>
      </Card>
    </div>
  );
}

export default HomePage;
