import { useMemo, useRef, useState } from 'react';
import { Card, Text, Button, Message } from '@expcat/tigercat-react';
import { FormWizard } from '@expcat/tigercat-react/FormWizard';
import { Transfer } from '@expcat/tigercat-react/Transfer';
import { Upload } from '@expcat/tigercat-react/Upload';
import { Cascader } from '@expcat/tigercat-react/Cascader';
import { Slider } from '@expcat/tigercat-react/Slider';
import { RadioGroup } from '@expcat/tigercat-react/RadioGroup';
import { Radio } from '@expcat/tigercat-react/Radio';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Result } from '@expcat/tigercat-react/Result';
import { Descriptions } from '@expcat/tigercat-react/Descriptions';
import type {
  WizardStep,
  TransferItem,
  CascaderOption,
  CascaderValue,
  DescriptionsItem,
  UploadFile,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { UploadIcon } from '../components/Icons';

const STEPS: WizardStep[] = [
  { title: '选择数据源', description: '上传文件与模式' },
  { title: '字段映射', description: '源字段 → 目标字段' },
  { title: '参数配置', description: '批量与冲突策略' },
  { title: '确认并导入', description: '核对并执行' },
];

const SOURCE_FIELDS: TransferItem[] = [
  { key: 'name', label: '姓名' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机号' },
  { key: 'dept', label: '部门' },
  { key: 'title', label: '职位' },
  { key: 'joinedAt', label: '入职日期' },
  { key: 'note', label: '备注' },
];

const TARGET_OPTIONS: CascaderOption[] = [
  {
    value: 'hr',
    label: '人力资源',
    children: [
      { value: 'employees', label: '员工表' },
      { value: 'departments', label: '部门表' },
    ],
  },
  {
    value: 'crm',
    label: '客户管理',
    children: [
      { value: 'customers', label: '客户表' },
      { value: 'contacts', label: '联系人表' },
    ],
  },
];

const MODE_LABELS: Record<string, string> = {
  append: '追加',
  overwrite: '覆盖',
  upsert: '更新插入',
};
const CONFLICT_LABELS: Record<string, string> = {
  skip: '跳过',
  overwrite: '覆盖',
  error: '报错中止',
};

function resolveTargetText(value: CascaderValue): string {
  if (!value.length) return '未选择';
  const labels: string[] = [];
  let level: CascaderOption[] | undefined = TARGET_OPTIONS;
  for (const v of value) {
    const found: CascaderOption | undefined = level?.find((o) => o.value === v);
    if (!found) break;
    labels.push(found.label);
    level = found.children;
  }
  return labels.join(' / ');
}

function ImportPage() {
  const [current, setCurrent] = useState(0);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [mode, setMode] = useState('append');
  const [mappedKeys, setMappedKeys] = useState<(string | number)[]>(['name', 'email', 'dept']);
  const [target, setTarget] = useState<CascaderValue>(['hr', 'employees']);
  const [batchSize, setBatchSize] = useState(1000);
  const [conflict, setConflict] = useState('skip');

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  const targetText = useMemo(() => resolveTargetText(target), [target]);

  const summary: DescriptionsItem[] = [
    { label: '数据源', content: files.length ? files.map((f) => f.name).join('、') : '示例数据（未选择文件）' },
    { label: '导入模式', content: MODE_LABELS[mode] },
    { label: '目标数据表', content: targetText },
    { label: '映射字段', content: `${mappedKeys.length} 个` },
    { label: '批量大小', content: `${batchSize} 条 / 批` },
    { label: '冲突策略', content: CONFLICT_LABELS[conflict] },
  ];

  const handleFinish = () => {
    if (!mappedKeys.length) {
      Message.warning({ content: '请至少映射一个字段', duration: 2200 });
      setCurrent(1);
      return;
    }
    setImporting(true);
    setImportProgress(0);
    timerRef.current = window.setInterval(() => {
      setImportProgress((prev) => {
        const next = Math.min(100, prev + 20);
        if (next >= 100 && timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
          setImporting(false);
          setDone(true);
        }
        return next;
      });
    }, 220);
  };

  const restart = () => {
    setDone(false);
    setImporting(false);
    setImportProgress(0);
    setCurrent(0);
  };

  const renderStep = (_step: WizardStep, index: number) => {
    if (index === 0) {
      return (
        <div className="space-y-4 pt-4">
          <div>
            <Text weight="medium" className="mb-1 block">
              上传文件（CSV / Excel）
            </Text>
            <Upload autoUpload={false} accept=".csv,.xlsx,.xls" drag onChange={(_file, list) => setFiles(list)}>
              <div className="p-4 text-center text-sm text-(--tiger-text-secondary,#64748b)">
                点击或拖拽文件到此处（演示，不会真正上传）
              </div>
            </Upload>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              导入模式
            </Text>
            <RadioGroup value={mode} onChange={(value) => setMode(String(value))}>
              <Radio value="append">追加</Radio>
              <Radio value="overwrite">覆盖</Radio>
              <Radio value="upsert">更新插入</Radio>
            </RadioGroup>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              目标数据表
            </Text>
            <Cascader value={target} onChange={setTarget} options={TARGET_OPTIONS} placeholder="选择目标数据表" />
          </div>
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="space-y-3 pt-4">
          <Text weight="medium" className="block">
            选择需要导入的源字段（右侧为目标字段）
          </Text>
          <Transfer
            value={mappedKeys}
            onChange={(keys) => setMappedKeys(keys)}
            dataSource={SOURCE_FIELDS}
            sourceTitle="源字段"
            targetTitle="目标字段"
            showSearch
          />
          <MutedPanel compact description="将左侧源字段移动到右侧即建立映射；未映射字段将被忽略。" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="space-y-5 pt-4">
          <div>
            <Text weight="medium" className="mb-2 block">
              批量大小：{batchSize} 条 / 批
            </Text>
            <Slider value={batchSize} onChange={(v) => setBatchSize(typeof v === 'number' ? v : v[0])} min={100} max={5000} step={100} />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              冲突策略
            </Text>
            <RadioGroup value={conflict} onChange={(value) => setConflict(String(value))}>
              <Radio value="skip">跳过</Radio>
              <Radio value="overwrite">覆盖</Radio>
              <Radio value="error">报错中止</Radio>
            </RadioGroup>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3 pt-4">
        <Text weight="medium" className="block">
          请核对导入配置
        </Text>
        <Descriptions items={summary} column={1} bordered colon />
        <MutedPanel compact description="点击「开始导入」按批执行，完成后展示结果页。" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UploadIcon size={24} />}
        title="数据导入"
        subtitle="分步导入向导：选择数据源、映射字段、配置参数并执行导入"
        tags={[
          { label: '运维', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      {done ? (
        <Card>
          <Result
            status="success"
            title="导入完成"
            subTitle={`已按「${MODE_LABELS[mode]}」模式导入至 ${targetText}，映射 ${mappedKeys.length} 个字段（演示）。`}>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={restart}>
                再次导入
              </Button>
              <Button onClick={restart}>返回列表</Button>
            </div>
          </Result>
        </Card>
      ) : importing ? (
        <Card>
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-2">
              <UploadIcon size={18} />
              <Text weight="bold">正在导入…</Text>
            </div>
            <Progress percentage={importProgress} status="normal" />
            <MutedPanel compact description="演示导入过程按批推进；完成后展示结果页。" />
          </div>
        </Card>
      ) : (
        <Card>
          <FormWizard
            steps={STEPS}
            current={current}
            onChange={(next) => setCurrent(next)}
            nextText="下一步"
            prevText="上一步"
            finishText="开始导入"
            onFinish={handleFinish}
            renderStep={renderStep}
          />
        </Card>
      )}
    </div>
  );
}

export default ImportPage;
