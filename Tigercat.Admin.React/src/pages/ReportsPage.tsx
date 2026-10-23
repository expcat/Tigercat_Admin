import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Loading } from '@expcat/tigercat-react/Loading';
import { Message } from '@expcat/tigercat-react/Message';
import { Text } from '@expcat/tigercat-react/Text';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { PrintLayout } from '@expcat/tigercat-react/PrintLayout';
import { Watermark } from '@expcat/tigercat-react/Watermark';
import { DataExport } from '@expcat/tigercat-react/DataExport';
import type { PrintLayoutInstance } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { ChartEmptyState, PageActionPanel } from '../components/PageFragments';
import { FileTextIcon } from '../components/Icons';
import { apiRequest, getAuthHeaders } from '../utils';
import type { StatsOverview, StatsTrend } from '../utils/types';
import {
  DATA_EXPORT_TRIGGER_FORMATS, EXPORT_FORMAT_LABELS, EXPORT_FORMATS,
  OVERVIEW_EXPORT_FIELDS, exportOverview, toExportColumns, type ExportFormat,
} from '../utils/export';

const REPORT_DAYS = [1, 7, 30, 90].map((value) => ({ value, label: `近 ${value} 天` }));

function ReportsPage() {
  const [trendDays, setTrendDays] = useState(7);
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [trend, setTrend] = useState<StatsTrend | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [reload, setReload] = useState(0);
  const printRef = useRef<PrintLayoutInstance>(null);
  const exportColumns = useMemo(() => toExportColumns(OVERVIEW_EXPORT_FIELDS), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrorMessage('');
    setOverview(null);
    setTrend(null);
    void (async () => {
      try {
        const [stats, series] = await Promise.all([
          apiRequest<StatsOverview>('/api/stats/overview', { headers: getAuthHeaders(), signal: controller.signal }),
          apiRequest<StatsTrend>(`/api/stats/trend?days=${trendDays}`, { headers: getAuthHeaders(), signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setOverview(stats.data);
        setTrend(series.data);
        setGeneratedAt(new Date().toLocaleString('zh-CN', { hour12: false }));
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : '报表加载失败');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [trendDays, reload]);

  const rows = useMemo(() => overview && trend ? [
    ...[
      ['totalUsers', '总用户数'], ['activeUsers', '活跃用户'], ['disabledUsers', '禁用用户'],
      ['totalRoles', '总角色数'], ['totalPermissions', '总权限数'],
    ].map(([key, label]) => ({ section: 'overview', key, label, value: String(overview[key as keyof StatsOverview]) })),
    ...trend.points.map(({ date, count }) => ({ section: 'trend', key: date, label: date, value: String(count) })),
  ] : [], [overview, trend]);
  const period = trend?.points.length ? `${trend.points[0].date} ~ ${trend.points[trend.points.length - 1].date}` : '暂无趋势数据';
  const ready = !loading && !errorMessage && rows.length > 0;

  const onExport = useCallback(async (format: ExportFormat) => {
    if (!ready || exporting) return;
    setExporting(true);
    try {
      await exportOverview({ format, days: trendDays, headers: getAuthHeaders() });
      Message.success({ content: '导出成功', duration: 3000 });
    } catch (error) {
      Message.error({ content: error instanceof Error ? error.message : '导出失败', duration: 3000 });
    } finally {
      setExporting(false);
    }
  }, [ready, exporting, trendDays]);

  return (
    <div className="space-y-6">
      <PageHeader icon={<FileTextIcon size={24} />} title="报表打印"
        subtitle="当前系统概览与用户创建趋势，预览、打印和导出使用相同数据域与天数"
        tags={[{ label: '系统统计', variant: 'primary' }]} />
      <PageActionPanel title="报表参数"
        description="概览为当前累计值；天数仅筛选按 UTC 日期统计的用户创建趋势。打印可另存为 PDF。"
        actions={<>
          <Segmented value={trendDays} options={REPORT_DAYS} disabled={exporting} onChange={(value) => setTrendDays(Number(value))} />
          <Button variant="outline" disabled={loading || exporting} onClick={() => setReload((value) => value + 1)}>刷新报表</Button>
          <Button disabled={!ready || exporting} onClick={() => printRef.current?.print()}>打印</Button>
          {EXPORT_FORMATS.map((format) => <DataExport key={format} columns={exportColumns} dataSource={[]}
            formats={DATA_EXPORT_TRIGGER_FORMATS} fileName="overview"
            labels={{ xlsxText: `导出 ${EXPORT_FORMAT_LABELS[format]}`, exportingText: '导出中...', triggerAriaLabel: `导出 ${EXPORT_FORMAT_LABELS[format]}` }}
            disabled={!ready || exporting} customExport={() => onExport(format)} />)}
        </>} />
      {errorMessage && <div className="space-y-3"><Alert type="error" title="报表加载失败" description={errorMessage} />
        <Button variant="outline" onClick={() => setReload((value) => value + 1)}>重试</Button></div>}
      {loading ? <div className="flex h-40 items-center justify-center" role="status" aria-label="报表加载中"><Loading /></div> : ready ? (
        <Card className="overflow-x-auto print:overflow-visible">
          <PrintLayout ref={printRef} className="p2-print-paper" pageSize="A4" orientation="portrait"
            showHeader showFooter headerText="Tigercat 后台 · 系统概览与用户创建趋势"
            footerText={`用户创建趋势（UTC）：${period}`}>
            <Watermark content="Tigercat · 系统统计" font={{ color: 'rgba(71,85,105,0.12)' }}>
              <div className="space-y-5 p-2">
                <div>
                  <Text size="lg" weight="bold">系统概览与用户创建趋势</Text>
                  <p>趋势区间（UTC）：<span data-testid="report-period">{period}</span> · 最近 {trendDays} 天</p>
                  <p>生成时间：{generatedAt} · 概览为当前累计值</p>
                  <p className="text-sm">数据来源：系统用户、角色与权限统计。导出按相同天数重新查询；数据变更后可刷新报表。</p>
                </div>
                <table className="p2-report-table w-full border-collapse text-sm" data-testid="report-data">
                  <caption className="mb-3 text-left font-medium">当前概览与按日新增用户明细</caption>
                  <thead><tr>{OVERVIEW_EXPORT_FIELDS.map((field) => <th key={field.key} className="border-b px-3 py-2 text-left font-medium">{field.label}</th>)}</tr></thead>
                  <tbody>{rows.map((row) => <tr key={`${row.section}-${row.key}`} data-section={row.section}>
                    <td className="border-b px-3 py-2">{row.section}</td><td className="border-b px-3 py-2">{row.key}</td>
                    <td className="border-b px-3 py-2">{row.label}</td><td className="border-b px-3 py-2 text-right tabular-nums">{row.value}</td>
                  </tr>)}</tbody>
                </table>
                <p className="text-sm">overview：当前累计概览；trend：对应 UTC 日期的新增用户数，包含零值日期。</p>
              </div>
            </Watermark>
          </PrintLayout>
        </Card>
      ) : !errorMessage && <ChartEmptyState description="暂无可生成的报表数据" />}
    </div>
  );
}

export default ReportsPage;
