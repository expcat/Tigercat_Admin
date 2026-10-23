import { useEffect, useMemo, useState } from 'react';
import { Loading } from '@expcat/tigercat-react/Loading';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Badge } from '@expcat/tigercat-react/Badge';
import { GaugeChart, AreaChart, LineChart } from '../utils/lazyTigercat';
import { ActivityFeed } from '@expcat/tigercat-react/ActivityFeed';
import type {
  ActivityItem,
  LineChartDatum,
  ProgressVariant,
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
  startMonitorLive,
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

function formatClock(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function progressVariant(value: number): ProgressVariant {
  if (value >= 85) return 'danger';
  if (value >= 70) return 'warning';
  return 'success';
}

function pushWindow(
  series: LineChartDatum[],
  point: LineChartDatum,
): LineChartDatum[] {
  return [...series, point].slice(-WINDOW_SIZE);
}

function chartTimeTicks(series: LineChartDatum[]) {
  const middle = Math.floor((series.length - 1) / 2);
  return series.filter((_, index) => index === 0 || index === middle || index === series.length - 1)
    .map(({ x }) => x);
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

function createEmptySnapshot(): MonitorViewState {
  return {
    cpu: 0, memory: 0, disk: 0, qps: 0, latency: 0,
    qpsSeries: [], latencySeries: [], nodes: [], events: [], lastTickAt: '--', tickCount: 0,
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
  const [snapshot, setSnapshot] = useState<MonitorViewState>(createEmptySnapshot);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (paused) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const stop = startMonitorLive(
      Number(intervalSec),
      (data) => {
        setSnapshot((prev) => applyRemoteSnapshot(prev, data));
        setErrorMessage('');
        setInitialized(true);
        setLoading(false);
      },
      (error) => {
        const message = readErrorMessage(error, '监控快照加载失败，请稍后重试。');
        setErrorMessage(message);
        setLoading(false);
      },
    );

    return stop;
  }, [paused, intervalSec, reload]);

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
        subtitle="演示监控快照，展示资源水位、吞吐延迟与节点事件"
        tags={[
          { label: '实时快照', variant: 'success' },
          { label: '登录可见', variant: 'info' },
        ]}
      />

      <PageActionPanel
        title="刷新控制"
        description="按所选间隔更新演示快照，默认 3 秒。暂停后保留最后快照，继续时恢复更新。"
        actions={
          <>
            <Segmented
              value={intervalSec}
              onChange={handleIntervalChange}
              options={intervalOptions}
            />
            <Tag variant={paused ? 'warning' : 'success'} size="sm">
              {paused ? '已暂停' : errorMessage ? '连接失败' : loading ? '加载中' : '刷新中'}
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
            <div role="alert"><Text color="secondary">{errorMessage}</Text></div>
            <Button variant="outline" onClick={() => { setPaused(false); setReload((value) => value + 1); }}>
              重试
            </Button>
          </div>
        </Card>
      )}

      {!initialized ? (loading ? <div className="flex h-40 items-center justify-center" role="status" aria-label="监控加载中"><Loading /></div> : <ChartEmptyState description={paused ? '监控已暂停，继续后加载快照' : '暂无监控快照，请重试'} />) : <>
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
                variant={progressVariant(gauge.value)}
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
              <AreaChart
                data={snapshot.qpsSeries}
                height={140}
                responsive
                xTickValues={chartTimeTicks(snapshot.qpsSeries)}
                yTicks={3}
                hoverable
              />
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
                xTickValues={chartTimeTicks(snapshot.latencySeries)}
                yTicks={3}
                hoverable
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
                    variant={progressVariant(node.cpu)}
                    format={(value) => `CPU ${Math.round(value)}%`}
                  />
                  <Progress
                    percentage={node.memory}
                    variant={progressVariant(node.memory)}
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

      </>}
      <MutedPanel
        title="演示说明"
        description="指标由服务端生成演示快照，不读取真实主机。QPS 与延迟显示最近 20 个采样点；暂停后停止更新。"
      />
    </div>
  );
}

export default MonitorPage;
