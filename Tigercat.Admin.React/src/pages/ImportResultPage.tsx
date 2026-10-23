import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Table } from '@expcat/tigercat-react/Table';
import { Text } from '@expcat/tigercat-react/Text';
import { PageHeader } from '../components/PageHeader';
import { UploadIcon } from '../components/Icons';
import { usePermission } from '../utils/permission';
import { ApiError } from '../utils/request';
import { downloadFailedRows, fetchImportJob, IMPORT_ROW_COLUMNS } from '../utils/import-jobs';
import type { ImportJob } from '../utils/types';

export default function ImportResultPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { has } = usePermission();
  const canCreate = has('user:create');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: number | undefined;
    setJob(null); setError(''); setStatus(0); setLoading(true);
    if (!canCreate) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data } = await fetchImportJob(id, controller.signal);
        if (controller.signal.aborted) return;
        setJob(data); setError(''); setLoading(false);
        if (data.status === 'pending' || data.status === 'running') timer = window.setTimeout(() => void load(), 500);
      } catch (failure) {
        if (controller.signal.aborted) return;
        const failureStatus = failure instanceof ApiError ? failure.status : 0;
        setStatus(failureStatus);
        if (failureStatus === 403 || failureStatus === 404) setJob(null);
        setError(failure instanceof Error ? failure.message : '导入结果加载失败'); setLoading(false);
      }
    };
    void load();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [id, retry, canCreate]);
  return <div className="space-y-6">
    <PageHeader icon={<UploadIcon size={24} />} title="导入结果" subtitle="按实际处理行数查看用户创建结果；刷新可恢复进度" tags={[{ label: '用户 CSV', variant: 'primary' }]} />
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => navigate('/import')}>返回数据导入</Button>
      {has('user:view') && <Button variant="outline" onClick={() => navigate('/users')}>查看用户管理</Button>}
    </div>
    {!canCreate ? <Alert type="warning" title="无权查看导入结果" description="需要 user:create 权限。" /> : loading ? <Card><Text>正在加载导入结果…</Text></Card> : <>
      {error && <Alert type="error" title={status === 404 ? '导入任务不存在' : status === 403 ? '无权查看导入结果' : '导入结果加载失败'} description={error}
        action={status !== 404 && <Button onClick={() => setRetry(value => value + 1)}>重试</Button>} />}
      {job && <>
        <Card>
          <div className="space-y-4">
            <Text className="block break-all" weight="medium">{job.source} · {job.id}</Text>
            <Text className="block" aria-live="polite">{job.status === 'completed' ? '导入完成' : job.status === 'failed' ? '导入已中断' : '正在导入…'} · 已处理 {job.processed}/{job.total} 行</Text>
            <Progress percentage={job.progress} status={job.status === 'failed' ? 'exception' : job.status === 'completed' ? 'success' : 'normal'} />
            <Alert type={job.status === 'failed' ? 'error' : job.result.failed ? 'warning' : 'info'} title={job.result.message}
              description={job.status === 'failed' ? '已完成结果已保留。重新选择原 CSV 后再次导入，已有用户名将跳过。' : '追加创建用户，重复用户名跳过；错误行不会阻止其他行处理。'} />
            <Text className="block" color="secondary">失败行下载的密码列已清空，请重新填写后导入。未处理行需使用原文件重新导入。</Text>
            <Button variant="outline" disabled={!job.rows.some(row => row.status === 'failed')} onClick={() => downloadFailedRows(job)}>下载失败行</Button>
          </div>
        </Card>
        <Card header={<Text weight="medium">逐行结果（{job.total} 行）</Text>}>
          <Table key={id} columns={IMPORT_ROW_COLUMNS} dataSource={job.rows} rowKey="rowNumber" responsiveMode="card" cardBreakpoint="md" pagination={{ pageSize: 10 }} />
        </Card>
      </>}
    </>}
  </div>;
}
