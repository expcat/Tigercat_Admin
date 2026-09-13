import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { DataTableWithToolbar } from '@expcat/tigercat-react/DataTableWithToolbar';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { SchemaForm } from '@expcat/tigercat-react/SchemaForm';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Tag } from '@expcat/tigercat-react/Tag';
import type { FormHandle, FormValues, TableColumn } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { ApprovalActorSwitcher } from '../components/ApprovalActorSwitcher';
import { CheckCircleIcon } from '../components/Icons';
import {
  APPROVAL_CREATE_SCHEMA,
  APPROVAL_DEMO_ACTOR_EVENT,
  APPROVAL_LANES,
  APPROVAL_PAGE_SIZE,
  APPROVAL_STATUS_META,
  approvalCreateFromValues,
  createApproval,
  EMPTY_APPROVAL_CREATE,
  fetchApprovals,
  isApprovalLane,
} from '../utils/approvals';
import type { ApprovalLane, ApprovalListItem, ApprovalStatus } from '../utils/types';

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ApprovalsPage() {
  const navigate = useNavigate();
  const createFormRef = useRef<FormHandle>(null);
  const [lane, setLane] = useState<ApprovalLane>('todo');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APPROVAL_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApprovalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormValues>({ ...EMPTY_APPROVAL_CREATE });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchApprovals({ lane, keyword, page, pageSize });
      setItems(payload.data.items ?? []);
      setTotal(payload.data.total ?? 0);
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '审批列表加载失败'), duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [keyword, lane, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const reload = () => {
      void loadList();
    };
    window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, reload);
    return () => window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, reload);
  }, [loadList]);

  const openDetail = (id: string) => {
    navigate(`/approvals/${encodeURIComponent(id)}`);
  };

  const handleCreate = async () => {
    const valid = await createFormRef.current?.validate();
    if (!valid) return;
    const body = approvalCreateFromValues(createForm);
    if (!body.title) {
      Message.warning({ content: '请填写审批标题', duration: 2000 });
      return;
    }
    setCreating(true);
    try {
      const payload = await createApproval(body);
      setCreateOpen(false);
      setCreateForm({ ...EMPTY_APPROVAL_CREATE });
      createFormRef.current?.resetFields();
      Message.success({ content: '已发起审批', duration: 2000 });
      navigate(`/approvals/${encodeURIComponent(payload.data.id)}`);
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '发起审批失败'), duration: 3000 });
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo<TableColumn<ApprovalListItem>[]>(
    () => [
      {
        key: 'id',
        title: '单号',
        width: 120,
        hideInCard: true,
        render: (record) => <span className="font-mono text-sm">{record.id}</span>,
      },
      {
        key: 'title',
        title: '标题',
        cardTitle: true,
        render: (record) => (
          <Button variant="link" className="h-auto px-0 py-0 text-left" onClick={() => openDetail(record.id)}>
            {record.title}
          </Button>
        ),
      },
      {
        key: 'category',
        title: '类型',
        width: 100,
        render: (record) => record.category,
      },
      {
        key: 'starter',
        title: '发起人',
        width: 120,
        render: (record) => record.starter,
      },
      {
        key: 'assignee',
        title: '处理人',
        width: 120,
        render: (record) => record.assignee,
      },
      {
        key: 'status',
        title: '状态',
        width: 110,
        render: (record) => {
          const meta = APPROVAL_STATUS_META[record.status as ApprovalStatus] ?? APPROVAL_STATUS_META.pending;
          return (
            <Tag variant={meta.variant} size="sm">
              {meta.label}
            </Tag>
          );
        },
      },
      {
        key: 'currentStepTitle',
        title: '当前步骤',
        width: 140,
        render: (record) => record.currentStepTitle ?? '—',
      },
      {
        key: 'updatedAt',
        title: '更新时间',
        width: 160,
        render: (record) => <span className="p2-text-secondary text-sm">{record.updatedAt}</span>,
      },
      {
        key: 'actions',
        title: '操作',
        width: 100,
        align: 'center',
        render: (record) => (
          <Button size="sm" variant="ghost" onClick={() => openDetail(record.id)}>
            查看
          </Button>
        ),
      },
    ],
    [],
  );

  const toolbar = useMemo(
    () => ({
      searchMode: 'remote' as const,
      searchValue: keyword,
      searchPlaceholder: '搜索标题或单号',
      onSearchChange: (value: string) => {
        setKeyword(value);
        setPage(1);
      },
      onSearch: (value: string) => {
        setKeyword(value);
        setPage(1);
      },
    }),
    [keyword],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="审批中心"
        subtitle="待办、已办、抄送与我发起的申请。可按身份切换当前处理人。"
        icon={<CheckCircleIcon size={22} />}
        tags={[{ label: 'Mock 流转', variant: 'info' }]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={lane}
          options={APPROVAL_LANES}
          onChange={(value) => {
            const next = String(value);
            if (!isApprovalLane(next)) return;
            setLane(next);
            setPage(1);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalActorSwitcher />
          <Button onClick={() => setCreateOpen(true)}>发起审批</Button>
        </div>
      </div>

      <DataTableWithToolbar
        columns={columns as unknown as TableColumn<Record<string, unknown>>[]}
        dataSource={items as unknown as Record<string, unknown>[]}
        loading={loading}
        rowKey="id"
        hoverable
        striped
        responsiveMode="card"
        cardBreakpoint="md"
        emptyText="当前列表没有审批"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: true,
        }}
        toolbar={toolbar}
        onPageChange={({ current, pageSize: nextSize }) => {
          if (nextSize !== pageSize) return;
          setPage(current);
        }}
        onPageSizeChange={({ pageSize: nextSize }) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />

      <Modal
        open={createOpen}
        title="发起审批"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button loading={creating} onClick={() => void handleCreate()}>
              提交
            </Button>
          </div>
        }>
        <SchemaForm
          ref={createFormRef}
          schema={APPROVAL_CREATE_SCHEMA}
          value={createForm}
          showActions={false}
          labelWidth={96}
          ariaLabel="发起审批表单"
          onChange={setCreateForm}
        />
      </Modal>
    </div>
  );
}

export default ApprovalsPage;
