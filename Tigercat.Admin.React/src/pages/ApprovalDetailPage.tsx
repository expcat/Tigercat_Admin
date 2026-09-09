import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Affix } from '@expcat/tigercat-react/Affix';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Descriptions } from '@expcat/tigercat-react/Descriptions';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { Select } from '@expcat/tigercat-react/Select';
import { TabPane } from '@expcat/tigercat-react/TabPane';
import { Tabs } from '@expcat/tigercat-react/Tabs';
import { Text } from '@expcat/tigercat-react/Text';
import { Textarea } from '@expcat/tigercat-react/Textarea';
import { WorkflowViewer } from '@expcat/tigercat-react/WorkflowViewer';
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-react/WorkflowTimeline';
import type { DescriptionsItem, WorkflowActionBarItem, WorkflowActionPayload } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { CheckCircleIcon } from '../components/Icons';
import { normalizeInput } from '../utils';
import { ApiError } from '../utils/request';
import {
  actionSuccessMessage,
  applyApprovalAction,
  APPROVAL_STATUS_META,
  APPROVAL_TRANSFER_OPTIONS,
  APPROVAL_WORKFLOW_ACTIONS,
  fetchApproval,
  isApprovalTerminal,
  toWorkflowSteps,
} from '../utils/approvals';
import type { ApprovalAction, ApprovalDetail, ApprovalStatus } from '../utils/types';

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ApprovalDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ? decodeURIComponent(params.id) : '';
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState('demo');
  const [transferComment, setTransferComment] = useState('');
  const [activeTab, setActiveTab] = useState('progress');

  const loadDetail = useCallback(async () => {
    if (!id) {
      setMissing(true);
      setDetail(null);
      return;
    }
    setLoading(true);
    setMissing(false);
    try {
      const payload = await fetchApproval(id);
      setDetail(payload.data);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404) {
        setMissing(true);
        setDetail(null);
      } else {
        Message.error({ content: readErrorMessage(error, '审批详情加载失败'), duration: 3000 });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setActiveTab('progress');
    void loadDetail();
  }, [loadDetail]);

  const statusMeta = detail
    ? (APPROVAL_STATUS_META[detail.status as ApprovalStatus] ?? APPROVAL_STATUS_META.pending)
    : APPROVAL_STATUS_META.pending;
  const steps = useMemo(() => toWorkflowSteps(detail), [detail]);
  const descriptions: DescriptionsItem[] = (detail?.formFields ?? []).map((field) => ({
    label: field.label,
    content: field.value,
  }));
  const actionsDisabled = acting || isApprovalTerminal(detail?.status);

  const runAction = async (action: ApprovalAction, extra?: { comment?: string; transferTo?: string }) => {
    if (!detail) return;
    setActing(true);
    try {
      const payload = await applyApprovalAction(detail.id, {
        action,
        comment: extra?.comment,
        transferTo: extra?.transferTo,
      });
      setDetail(payload.data);
      Message.success({ content: actionSuccessMessage(action), duration: 2200 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '审批动作失败'), duration: 3000 });
    } finally {
      setActing(false);
    }
  };

  const handleWorkflowAction = (item: WorkflowActionBarItem, payload?: WorkflowActionPayload) => {
    if (item.action === 'transfer') {
      setTransferTo(detail?.assignee === 'admin' ? 'demo' : 'admin');
      setTransferComment('');
      setTransferOpen(true);
      return;
    }
    if (item.action === 'approve' || item.action === 'reject') {
      const comment = payload?.comment?.trim();
      void runAction(item.action, { comment: comment || undefined });
    }
  };

  const confirmTransfer = async () => {
    const target = transferTo.trim();
    if (!target) {
      Message.warning({ content: '请选择转交对象', duration: 2000 });
      return;
    }
    await runAction('transfer', { transferTo: target, comment: transferComment.trim() || undefined });
    setTransferOpen(false);
  };

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={detail?.title ?? '审批详情'}
        subtitle="表单 + 审批进度 Timeline / 流程结构 Viewer + 底栏 ActionBar。动作写回 mock 实例。"
        icon={<CheckCircleIcon size={22} />}
        tags={[{ label: statusMeta.label, variant: statusMeta.variant }]}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate('/approvals')}>
          返回列表
        </Button>
        {detail?.ticketId ? (
          <Button variant="ghost" onClick={() => navigate('/tickets')}>
            打开关联工单 {detail.ticketId}
          </Button>
        ) : null}
      </div>

      {missing ? (
        <Empty description="没有找到该审批实例" />
      ) : loading && !detail ? (
        <Text color="secondary">正在加载审批详情…</Text>
      ) : detail ? (
        <div className="min-w-0 space-y-4">
          <Card header={<Text weight="bold">申请表单</Text>} className="min-w-0">
            <Descriptions items={descriptions} column={1} />
          </Card>
          <Card className="min-w-0">
            <Tabs activeKey={activeTab} onActiveKeyChange={(key) => setActiveTab(String(key))}>
              <TabPane tabKey="progress" label="审批进度">
                <div className="min-w-0 overflow-x-auto">
                  <WorkflowTimeline steps={steps} />
                </div>
              </TabPane>
              <TabPane tabKey="structure" label="流程结构">
                <div className="min-w-0 overflow-x-auto">
                  <WorkflowViewer steps={steps} />
                </div>
              </TabPane>
            </Tabs>
          </Card>
          <Affix target="#main-content-scroll" offsetBottom={0} zIndex={20}>
            <Card className="min-w-0">
              <div className="min-w-0">
                <WorkflowActionBar
                  items={APPROVAL_WORKFLOW_ACTIONS}
                  confirm
                  disabled={actionsDisabled}
                  ariaLabel="审批操作"
                  onAction={handleWorkflowAction}
                />
              </div>
              <Text size="sm" color="secondary" className="mt-2 block">
                同意 / 拒绝 / 转交会写回当前实例；关联工单时同步工单状态。不接审批引擎。
              </Text>
            </Card>
          </Affix>
        </div>
      ) : null}

      <Modal
        open={transferOpen}
        title="转交审批"
        onClose={() => setTransferOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              取消
            </Button>
            <Button loading={acting} onClick={() => void confirmTransfer()}>
              确认转交
            </Button>
          </div>
        }>
        <Form labelWidth={96}>
          <FormItem label="转交给" required>
            <Select value={transferTo} options={APPROVAL_TRANSFER_OPTIONS} onChange={(value) => setTransferTo(String(value))} />
          </FormItem>
          <FormItem label="说明">
            <Textarea
              value={transferComment}
              rows={3}
              placeholder="可选转交意见"
              onChange={(value) => setTransferComment(normalizeInput(value))}
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

export default ApprovalDetailPage;
