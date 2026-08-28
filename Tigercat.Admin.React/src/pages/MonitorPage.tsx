import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Tag, Text, Message } from '@expcat/tigercat-react';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Badge } from '@expcat/tigercat-react/Badge';
import { GaugeChart } from '@expcat/tigercat-react/GaugeChart';
import { AreaChart } from '@expcat/tigercat-react/AreaChart';
import { LineChart } from '@expcat/tigercat-react/LineChart';
import { ActivityFeed } from '@expcat/tigercat-react/ActivityFeed';
import type {
  ActivityItem,
  LineChartDatum,
  ProgressStatus,
  SegmentedOption,
  TagVariant,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import {
  ChartEmptyState,
  MetricCard,
  MetricGrid,
  MutedPanel,
  PageActionPanel,
} from '../components/PageFragments';
import {
  ActivityIcon,
  ClockIcon,
  MonitorIcon,
  ServerIcon,
  ZapIcon,
} from '../components/Icons';
import {
  fetchMonitorSnapshot,
  type MonitorNode,
  type MonitorNodeStatus,
  type MonitorSnapshot,
} from '../utils/monitor';
import { formatDisplayDateTime } from '../utils/common';

type IntervalSec = '2' | '3' | '5';

interface MonitorViewState {
  cpu: number;
  memory: number;
  disk: number;
  qps: number;
  latency: number;
  qpsSeries: LineChartDatum[];
  latencySeries: LineChartDatum[];
  nodes: MonitorNode[];
  events: ActivityItem[];
  lastTickAt: string;
  tickCount: number;
}

const DEFAULT_INTERVAL: IntervalSec = '3';
const WINDOW_SIZE = 20;
const FEED_CAP = 20;

const intervalOptions: SegmentedOption[] = [
  { value: '2', label: '2 秒' },
  { value: '3', label: '3 秒' },
  { value: '5', label: '5 秒' },
];

const GAUGE_SEGMENTS = [
  { range: [0, 70] as [number, number], color: 'var(--tiger-success)' },
  { range: [70, 85] as [number, number], color: 'var(--tiger-warning)' },
  { range: [85, 100] as [number, number], color: 'var(--tiger-error)' },
];

const NODE_STATUS_META: Record<MonitorNodeStatus, { label: string; variant: TagVariant }> = {
  healthy: { label: '健康', variant: 'success' },
  warning: { label: '告警', variant: 'warning' },
  critical: { label: '异常', variant: 'danger' },
};

const SEED_NODES: Array<Pick<MonitorNode, 'id' | 'name' | 'zone'>> = [
  { id: 'api-hz-1', name: 'api-hz-1', zone: '华东' },
  { id: 'api-bj-1', name: 'api-bj-1', zone: '华北' },
  { id: 'worker-hz-1', name: 'worker-hz-1', zone: '华东' },
  { id: 'cache-hz-1', name: 'cache-hz-1', zone: '华东' },
];

const SEED_QPS = [820, 846, 831, 874, 902, 888, 915, 940, 928, 961, 974, 952, 981, 996, 1012, 998, 1024, 1040, 1031, 1056];
const SEED_LATENCY = [38, 36, 41, 39, 42, 40, 44, 43, 41, 45, 47, 44, 46, 48, 45, 43, 42, 44, 46, 45];

function formatClock(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function healthFromLoad(cpu: number, memory: number): MonitorNodeStatus {
  const load = Math.max(cpu, memory);
  if (load >= 85) return 'critical';
  if (load >= 70) return 'warning';
  return 'healthy';
}

function progressStatus(value: number): ProgressStatus {
  if (value >= 85) return 'exception';
  if (value >= 70) return 'paused';
  return 'success';
}

function pushWindow(
  series: LineChartDatum[],
  point: LineChartDatum,
): LineChartDatum[] {
  return [...series, point].slice(-WINDOW_SIZE);
}

function seedWindow(
  values: number[],
  now: Date,
  intervalMs: number,
): LineChartDatum[] {
  return values.map((y, index) => ({
    x: formatClock(new Date(now.getTime() - (values.length - 1 - index) * intervalMs)),
    y,
  }));
}

function nodeStatus(value: string | undefined): MonitorNodeStatus {
  if (value === 'warning' || value === 'critical' || value === 'healthy') {
    return value;
  }
  return 'healthy';
}

function toActivityItems(events: MonitorSnapshot['events']): ActivityItem[] {
  return events.slice(0, FEED_CAP).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    time: formatDisplayDateTime(item.time),
    status: item.status,
  }));
}

function createSeedSnapshot(): MonitorViewState {
  const now = new Date();
  const intervalMs = Number(DEFAULT_INTERVAL) * 1000;
  const nodes: MonitorNode[] = [
    { ...SEED_NODES[0], cpu: 46, memory: 58, status: 'healthy' },
    { ...SEED_NODES[1], cpu: 62, memory: 71, status: 'warning' },
    { ...SEED_NODES[2], cpu: 38, memory: 44, status: 'healthy' },
    { ...SEED_NODES[3], cpu: 51, memory: 63, status: 'healthy' },
  ].map((node) => ({ ...node, status: healthFromLoad(node.cpu, node.memory) }));

  return {
    cpu: 54,
    memory: 61,
    disk: 67,
    qps: SEED_QPS[SEED_QPS.length - 1],
    latency: SEED_LATENCY[SEED_LATENCY.length - 1],
    qpsSeries: seedWindow(SEED_QPS, now, intervalMs),
    latencySeries: seedWindow(SEED_LATENCY, now, intervalMs),
    nodes,
    events: [
      {
        id: 'evt-seed-1',
        title: 'API 网关流量升高',
        description: '入口 QPS 超过近窗均值',
        time: formatDisplayDateTime(new Date(now.getTime() - 9000)),
        status: { label: '告警', variant: 'warning' as TagVariant },
      },
      {
        id: 'evt-seed-2',
        title: '工作节点恢复',
        description: '心跳已恢复，流量重新接入',
        time: formatDisplayDateTime(new Date(now.getTime() - 6000)),
        status: { label: '恢复', variant: 'success' as TagVariant },
      },
      {
        id: 'evt-seed-3',
        title: '缓存命中率回升',
        description: '热点 key 预热完成',
        time: formatDisplayDateTime(new Date(now.getTime() - 3000)),
        status: { label: '正常', variant: 'success' as TagVariant },
      },
    ].reverse(),
    lastTickAt: formatClock(now),
    tickCount: 3,
  };
}

function applyRemoteSnapshot(prev: MonitorViewState, data: MonitorSnapshot): MonitorViewState {
  const at = data.serverTime ? new Date(data.serverTime) : new Date();
  const clock = Number.isNaN(at.getTime()) ? formatClock(new Date()) : formatClock(at);
  const nodes = (data.nodes ?? []).map((node) => ({
    ...node,
    status: nodeStatus(node.status),
  }));
  return {
    cpu: data.cpu,
    memory: data.memory,
    disk: data.disk,
    qps: data.qps,
    latency: data.latency,
    qpsSeries: pushWindow(prev.qpsSeries, { x: clock, y: data.qps }),
    latencySeries: pushWindow(prev.latencySeries, { x: clock, y: data.latency }),
    nodes,
    events: toActivityItems(data.events ?? []),
    lastTickAt: clock,
    tickCount: data.tickCount ?? prev.tickCount + 1,
  };
}

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function MonitorPage() {
  const [intervalSec, setIntervalSec] = useState<IntervalSec>(DEFAULT_INTERVAL);
  const [paused, setPaused] = useState(false);
  const [snapshot, setSnapshot] = useState<MonitorViewState>(createSeedSnapshot);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialized, setInitialized] = useState(false);
  const initializedRef = useRef(false);

  const loadSnapshot = useCallback(async () => {
    if (!initializedRef.current) {
      setLoading(true);
    }
    try {
      const payload = await fetchMonitorSnapshot();
      setSnapshot((prev) => applyRemoteSnapshot(prev, payload.data));
      setErrorMessage('');
      initializedRef.current = true;
      setInitialized(true);
    } catch (error) {
      const message = readErrorMessage(error, '监控快照加载失败，请稍后重试。');
      setErrorMessage(message);
      Message.error({ content: message, duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (paused) {
      return;
    }

    void loadSnapshot();
    const timer = window.setInterval(() => {
      void loadSnapshot();
    }, Number(intervalSec) * 1000);

    return () => window.clearInterval(timer);
  }, [paused, intervalSec, loadSnapshot]);

  const handleIntervalChange = (value: string | number) => {
    const next = String(value);
    if (next === '2' || next === '3' || next === '5') {
      setIntervalSec(next);
    }
  };

  const handleTogglePause = () => {
    setPaused((prev) => !prev);
  };

  const healthyCount = useMemo(
    () => snapshot.nodes.filter((node) => node.status === 'healthy').length,
    [snapshot.nodes],
  );

  const gauges = [
    { key: 'cpu', label: 'CPU', value: snapshot.cpu },
    { key: 'memory', label: '内存', value: snapshot.memory },
    { key: 'disk', label: '磁盘', value: snapshot.disk },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MonitorIcon size={24} />}
        title="实时监控"
        subtitle="轮询监控快照，展示资源水位、吞吐延迟与节点事件"
        tags={[
          { label: '实时快照', variant: 'success' },
          { label: '登录可见', variant: 'info' },
        ]}
      />

      <PageActionPanel
        title="刷新控制"
        description="按 2 / 3 / 5 秒轮询 GET /api/monitor/snapshot，默认 3 秒；暂停后停止请求，卸载时清除定时器。"
        actions={
          <>
            <Segmented
              value={intervalSec}
              onChange={handleIntervalChange}
              options={intervalOptions}
            />
            <Tag variant={paused ? 'warning' : 'success'} size="sm">
              {paused ? '已暂停' : loading && !initialized ? '加载中' : '刷新中'}
            </Tag>
            <Tag variant="info" size="sm">
              最近 {snapshot.lastTickAt}
            </Tag>
            <Button variant="outline" onClick={handleTogglePause}>
              {paused ? '继续' : '暂停'}
            </Button>
          </>
        }
      />

      {errorMessage && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text color="secondary">{errorMessage}</Text>
            <Button variant="outline" onClick={() => void loadSnapshot()}>
              重试
            </Button>
          </div>
        </Card>
      )}

      <MetricGrid columns={4}>
        <MetricCard
          title="当前 QPS"
          value={snapshot.qps}
          description="近窗滚动"
          icon={<ZapIcon size={20} />}
        />
        <MetricCard
          title="P95 延迟"
          value={snapshot.latency}
          description="毫秒"
          icon={<ClockIcon size={20} />}
        />
        <MetricCard
          title="健康节点"
          value={healthyCount}
          description={`共 ${snapshot.nodes.length} 个节点`}
          badge={healthyCount}
          icon={<ServerIcon size={20} />}
        />
        <MetricCard
          title="事件条数"
          value={snapshot.events.length}
          description={`环形缓冲 ${FEED_CAP} 条`}
          icon={<ActivityIcon size={20} />}
        />
      </MetricGrid>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {gauges.map((gauge) => (
          <Card key={gauge.key} header={<Text weight="bold">{`${gauge.label} 水位`}</Text>}>
            <GaugeChart
              value={gauge.value}
              min={0}
              max={100}
              height={180}
              label={gauge.label}
              segments={GAUGE_SEGMENTS}
              valueFormatter={(value) => `${Math.round(value)}%`}
            />
            <div className="mt-3">
              <Progress
                percentage={gauge.value}
                status={progressStatus(gauge.value)}
                format={(value) => `${gauge.label} ${Math.round(value)}%`}
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <Statistic title="QPS" value={snapshot.qps} suffix="req/s" groupSeparator />
          {snapshot.qpsSeries.length ? (
            <div className="mt-3">
              <AreaChart data={snapshot.qpsSeries} height={140} responsive xTicks={6} />
            </div>
          ) : (
            <ChartEmptyState description="暂无 QPS 滚动数据" heightClassName="h-36" />
          )}
        </Card>
        <Card>
          <Statistic title="P95 延迟" value={snapshot.latency} suffix="ms" precision={1} />
          {snapshot.latencySeries.length ? (
            <div className="mt-3">
              <LineChart
                data={snapshot.latencySeries}
                height={140}
                responsive
                xTicks={6}
                showArea={false}
                showPoints={false}
                includeZero={true}
                lineColor="var(--tiger-primary)"
                xTickFormat={(value) => String(value)}
              />
            </div>
          ) : (
            <ChartEmptyState description="暂无延迟滚动数据" heightClassName="h-36" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card header={<Text weight="bold">节点状态</Text>}>
          <div className="mb-3 flex items-center gap-2">
            <Badge content={healthyCount} variant="success" standalone />
            <Text size="sm" color="secondary">
              个节点健康
            </Text>
          </div>
          <div className="space-y-3">
            {snapshot.nodes.map((node) => {
              const meta = NODE_STATUS_META[node.status];
              return (
                <div
                  key={node.id}
                  className="p2-muted-panel flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Text weight="bold">{node.name}</Text>
                      <Text size="sm" color="secondary">
                        {node.zone}
                      </Text>
                    </div>
                    <Tag variant={meta.variant} size="sm">
                      {meta.label}
                    </Tag>
                  </div>
                  <Progress
                    percentage={node.cpu}
                    status={progressStatus(node.cpu)}
                    format={(value) => `CPU ${Math.round(value)}%`}
                  />
                  <Progress
                    percentage={node.memory}
                    status={progressStatus(node.memory)}
                    format={(value) => `内存 ${Math.round(value)}%`}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <Card header={<Text weight="bold">实时事件</Text>}>
          <div className="max-h-[420px] overflow-y-auto">
            {snapshot.events.length ? (
              <ActivityFeed
                items={snapshot.events}
                emptyText="暂无实时事件"
                groupBy={() => '最近事件'}
              />
            ) : (
              <ChartEmptyState description="暂无实时事件" heightClassName="min-h-40" />
            )}
          </div>
        </Card>
      </div>

      <MutedPanel
        title="演示说明"
        description="本页轮询 GET /api/monitor/snapshot。服务端用内存步进生成指标，不读取真实主机。QPS 与延迟在前端拼接最近 20 点；事件流按接口返回封顶。暂停后不再发请求。"
      />
    </div>
  );
}

export default MonitorPage;
