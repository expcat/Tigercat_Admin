import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { FormWizard } from '@expcat/tigercat-react/FormWizard';
import { Select } from '@expcat/tigercat-react/Select';
import { Table } from '@expcat/tigercat-react/Table';
import { Text } from '@expcat/tigercat-react/Text';
import { PageHeader } from '../components/PageHeader';
import { UploadIcon } from '../components/Icons';
import { usePermission } from '../utils/permission';
import { createImportJob, EMPTY_IMPORT_MAPPINGS, IMPORT_FIELDS, IMPORT_ROW_COLUMNS, IMPORT_STEPS, previewUserImport,
  readImportFile, readLastImportJobId, writeLastImportJobId } from '../utils/import-jobs';
import type { ImportFile, ImportMappings, ImportPreview } from '../utils/types';

export default function ImportPage() {
  const navigate = useNavigate();
  const { has } = usePermission();
  const canCreate = has('user:create');
  const [current, setCurrent] = useState(0);
  const [narrowSteps, setNarrowSteps] = useState(false);
  const [file, setFile] = useState<ImportFile | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappings, setMappings] = useState<ImportMappings>({ ...EMPTY_IMPORT_MAPPINGS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastId] = useState(readLastImportJobId);
  const fileInput = useRef<HTMLInputElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const mapped = mappings.username !== null && mappings.password !== null;
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const sync = () => setNarrowSteps(query.matches);
    sync(); query.addEventListener('change', sync);
    return () => { query.removeEventListener('change', sync); request.current?.abort(); };
  }, []);
  useEffect(() => { if (current) stepHeading.current?.focus(); }, [current]);

  async function selectFile(selected?: File) {
    if (!selected) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setFile(null); setPreview(null);
    try {
      const content = await readImportFile(selected);
      if (controller.signal.aborted) return;
      setFile(content);
      const { data } = await previewUserImport(content, undefined, controller.signal);
      if (!controller.signal.aborted) { setPreview(data); setMappings(data.mappings); }
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'CSV 读取失败'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function handleNext() {
    if (busy || !file || !preview) return;
    if (current === 0) { setCurrent(1); return; }
    if (!mapped) { setError('请映射用户名和密码必填列'); return; }
    const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
    try {
      const { data } = await previewUserImport(file, mappings, controller.signal);
      if (!controller.signal.aborted) { setPreview(data); setCurrent(2); }
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '预览校验失败'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function handleFinish() {
    if (busy || !file || !mapped) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
    try {
      const { data } = await createImportJob(file, mappings, controller.signal);
      if (controller.signal.aborted) return;
      writeLastImportJobId(data.id); setFile(null); navigate(`/import/${encodeURIComponent(data.id)}`);
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '创建导入任务失败'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function cancelImport() {
    request.current?.abort(); setBusy(false); setFile(null); setPreview(null); setMappings({ ...EMPTY_IMPORT_MAPPINGS }); setCurrent(0); setError('');
    if (fileInput.current) fileInput.current.value = '';
    window.requestAnimationFrame(() => fileInput.current?.focus());
  }
  const renderStep = () => <div className="space-y-4 pt-4">
    <h2 ref={stepHeading} tabIndex={-1} className="text-base font-medium">{IMPORT_STEPS[current].title}</h2>
    {current === 0 ? <>
      <label className="block space-y-2"><span>选择 UTF-8 CSV 文件</span><input ref={fileInput} type="file" accept=".csv,text/csv" className="block max-w-full text-sm" disabled={busy}
        onChange={event => { const selected = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void selectFile(selected); }} /></label>
      <Text className="block" color="secondary">最多 1 MiB / 1000 行。首行为列名；支持 BOM、引号、逗号和字段内换行。</Text>
      <Text className="block">目标：用户。追加创建，重复用户名跳过；新用户默认启用。</Text>
      <Text className="block" color="secondary">支持 username、password、displayName、roleIds（多个角色 ID 用分号分隔）。状态与头像不参与导入。</Text>
      {file && <Text className="block break-all">已读取：{file.source}{preview ? `，${preview.total} 行` : ''}</Text>}
    </> : current === 1 ? <>
      <Text className="block" color="secondary">选择每个用户字段对应的 CSV 列。未映射列会忽略，密码仅用于校验和创建。</Text>
      <div className="grid gap-4 sm:grid-cols-2">{IMPORT_FIELDS.map(field => <label key={field.key} className="block min-w-0 space-y-1"><span>{field.label}</span>
        <Select value={mappings[field.key] ?? ''} aria-label={field.label} options={[{ value: '', label: '不映射' }, ...(preview?.headers.map((header, index) => ({ value: index, label: `${index + 1}. ${header}` })) ?? [])]}
          onChange={value => { setMappings(old => ({ ...old, [field.key]: value === '' || value === null ? null : Number(value) })); setError(''); }} />
      </label>)}</div>
    </> : preview && <>
      <Text className="block break-all">{file?.source} · 共 {preview.total} 行</Text>
      <Alert type={preview.failed ? 'warning' : 'info'} title={`校验通过 ${preview.valid}，跳过 ${preview.skipped}，失败 ${preview.failed}`} description={`${preview.passwordHint}。合法行会创建用户；错误行不会阻止其他行处理，提交时重新校验。`} />
      <Table columns={IMPORT_ROW_COLUMNS} dataSource={preview.rows} rowKey="rowNumber" responsiveMode="card" cardBreakpoint="md" pagination={{ pageSize: 10 }} />
      <Text className="block" color="secondary">预览和结果均不显示密码。导入后可下载失败行，密码列会清空，需要重新填写。</Text>
    </>}
  </div>;
  return <div className="space-y-6">
    <PageHeader icon={<UploadIcon size={24} />} title="数据导入" subtitle="读取用户 CSV、映射字段、校验并实际创建用户" tags={[{ label: '用户 CSV', variant: 'primary' }]} />
    {!canCreate ? <Alert type="warning" title="无权导入用户" description="需要 user:create 权限。" /> : <>
      {lastId && <Button variant="outline" onClick={() => navigate(`/import/${encodeURIComponent(lastId)}`)}>查看最近导入结果</Button>}
      <Card>
        {error && <Alert type="error" title="导入未提交" description={error} />}
        <fieldset disabled={busy} className="min-w-0">
          <FormWizard steps={IMPORT_STEPS} current={current} orientation={narrowSteps ? 'vertical' : 'horizontal'} showActions={false} renderStep={renderStep} />
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={cancelImport} disabled={busy}>取消导入</Button>
          {current > 0 && <Button variant="outline" disabled={busy} onClick={() => { setError(''); setCurrent(current - 1); }}>上一步</Button>}
          {current < 2 ? <Button disabled={busy || !preview || current === 1 && !mapped} onClick={() => void handleNext()}>{busy ? '正在读取…' : current === 1 ? '校验并预览' : '下一步'}</Button>
            : <Button loading={busy} disabled={busy || !preview?.total} onClick={() => void handleFinish()}>开始导入</Button>}
        </div>
      </Card>
    </>}
  </div>;
}
