import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DataTableWithToolbar,
  Button,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Input,
  Modal,
  Form,
  FormItem,
  Popconfirm,
  Select,
  Tag,
  Tooltip,
  Message,
  Popover,
  Checkbox,
} from '@expcat/tigercat-react';
import type {
  TableColumn,
  SortState,
  TableToolbarFilterValue,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { PermissionGuard } from '../components/PermissionGuard';
import {
  UsersIcon,
  UserPlusIcon,
  SettingsIcon,
  DownloadIcon,
} from '../components/Icons';
import {
  apiRequest,
  normalizeInput,
  debounce,
  getAuthHeaders,
  exportData,
} from '../utils';
import type { ExportFormat } from '../utils/export';
import { usePermission } from '../utils/permission';
import type {
  RoleInfo,
  UserItem,
  PagedResult,
  MessageResult,
} from '../utils/types';

type UserFormData = {
  username: string;
  password: string;
  displayName: string;
  status: number;
  roleIds: number[];
};

const INITIAL_FORM: UserFormData = {
  username: '',
  password: '',
  displayName: '',
  status: 0,
  roleIds: [],
};

const EXPORT_FIELD_OPTIONS = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: '用户名' },
  { key: 'displayName', label: '显示名' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '更新时间' },
  { key: 'roles', label: '角色' },
] as const;

const FORMAT_OPTIONS = [
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' },
  { label: 'XLSX', value: 'xlsx' },
];

const ALL_COLUMN_KEYS = [
  'id',
  'username',
  'displayName',
  'status',
  'roles',
  'createdAt',
  'actions',
] as const;

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  username: '用户名',
  displayName: '显示名',
  status: '状态',
  roles: '角色',
  createdAt: '创建时间',
  actions: '操作',
};

const STATUS_FILTER_OPTIONS = [
  { label: '正常', value: 0 },
  { label: '禁用', value: 1 },
];

function UsersPage() {
  const { has: hasPerm } = usePermission();

  // ---- State ----
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // Sort state (controlled)
  const [sortState, setSortState] = useState<SortState>({
    key: null,
    direction: null,
  });

  // Status filter
  const [statusFilter, setStatusFilter] = useState<number | null>(null);

  // Column visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增用户');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ ...INITIAL_FORM });

  const [batchDeleteConfirmVisible, setBatchDeleteConfirmVisible] =
    useState(false);

  // All roles for select
  const [allRoles, setAllRoles] = useState<RoleInfo[]>([]);

  // Export state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportFields, setExportFields] = useState<string[]>(() =>
    EXPORT_FIELD_OPTIONS.map((f) => f.key),
  );
  const [exporting, setExporting] = useState(false);

  // Ref to track current query state (avoids stale closures)
  const queryRef = useRef({
    page: currentPage,
    pageSize,
    keyword,
    sortState: { key: null, direction: null } as SortState,
    statusFilter: null as number | null,
  });

  // ---- Permission checks ----
  const canEdit = hasPerm('user:edit');
  const canDelete = hasPerm('user:delete');

  // ---- API calls ----
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const {
        page,
        pageSize: ps,
        keyword: kw,
        sortState: ss,
        statusFilter: sf,
      } = queryRef.current;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ps),
      });
      if (kw.trim()) {
        params.set('keyword', kw.trim());
      }
      if (ss.key && ss.direction) {
        params.set('sortBy', ss.key);
        params.set('sortOrder', ss.direction);
      }
      if (sf !== null) {
        params.set('status', String(sf));
      }
      const res = await apiRequest<PagedResult<UserItem>>(
        `/api/users?${params}`,
        {
          headers: getAuthHeaders(),
        },
      );
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      Message.error({
        content: e.message || '加载用户列表失败',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const res = await apiRequest<{ items: RoleInfo[] }>(
        '/api/roles?pageSize=100',
        { headers: getAuthHeaders() },
      );
      setAllRoles(res.data.items.map((r: any) => ({ id: r.id, name: r.name })));
    } catch {
      setAllRoles([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Form submit (create / update) ----
  const handleSubmit = async () => {
    if (!modalVisible) return;

    // Validation
    if (!editingId) {
      if (!formData.username.trim()) {
        Message.error({ content: '请输入用户名', duration: 3000 });
        return;
      }
      if (!formData.password) {
        Message.error({ content: '请输入密码', duration: 3000 });
        return;
      }
      if (formData.password.length < 6) {
        Message.error({ content: '密码长度不能少于 6 位', duration: 3000 });
        return;
      }
    }

    try {
      if (editingId) {
        const body: Record<string, any> = {
          displayName: formData.displayName || null,
          status: formData.status,
          roleIds: formData.roleIds,
        };
        if (formData.password) {
          body.password = formData.password;
        }
        await apiRequest(`/api/users/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        Message.success({ content: '用户更新成功', duration: 3000 });
      } else {
        await apiRequest('/api/users', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            username: formData.username.trim(),
            password: formData.password,
            displayName: formData.displayName || null,
            roleIds: formData.roleIds,
          }),
        });
        Message.success({ content: '用户创建成功', duration: 3000 });
      }
      setModalVisible(false);
      loadUsers();
    } catch (e: any) {
      Message.error({ content: e.message || '操作失败', duration: 3000 });
    }
  };

  // ---- Delete ----
  const handleDelete = async (user: UserItem) => {
    const userId = user.id;
    try {
      await apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      Message.success({ content: '删除成功', duration: 3000 });
      setSelectedRowKeys((prev) => prev.filter((k) => k !== userId));
      loadUsers();
    } catch (e: any) {
      Message.error({ content: e.message || '删除失败', duration: 3000 });
    }
  };

  // ---- Batch delete ----
  const handleBatchDelete = (keys = selectedRowKeys) => {
    if (keys.length === 0) {
      Message.error({ content: '请选择要删除的用户', duration: 3000 });
      return;
    }
    setSelectedRowKeys(keys as number[]);
    setBatchDeleteConfirmVisible(true);
  };

  const confirmBatchDelete = async () => {
    try {
      const res = await apiRequest<MessageResult>('/api/users/batch-delete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedRowKeys }),
      });
      Message.success({
        content: res.data.message || '批量删除成功',
        duration: 3000,
      });
      setBatchDeleteConfirmVisible(false);
      setSelectedRowKeys([]);
      loadUsers();
    } catch (e: any) {
      Message.error({ content: e.message || '批量删除失败', duration: 3000 });
    }
  };

  // ---- Export ----
  const openExportModal = () => {
    setExportFormat('csv');
    setExportFields(EXPORT_FIELD_OPTIONS.map((f) => f.key));
    setExportModalVisible(true);
  };

  const toggleExportField = (key: string) => {
    setExportFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  };

  const handleExport = async () => {
    if (exportFields.length === 0) {
      Message.error({ content: '请至少选择一个导出字段', duration: 3000 });
      return;
    }
    setExporting(true);
    try {
      await exportData({
        entity: 'users',
        format: exportFormat,
        fields: exportFields,
        headers: getAuthHeaders(),
      });
      Message.success({ content: '导出成功', duration: 3000 });
      setExportModalVisible(false);
    } catch (e: any) {
      Message.error({ content: e.message || '导出失败', duration: 3000 });
    } finally {
      setExporting(false);
    }
  };

  // ---- Modal helpers ----
  const openCreateModal = () => {
    setEditingId(null);
    setModalTitle('新增用户');
    setFormData({ ...INITIAL_FORM });
    setModalVisible(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingId(user.id);
    setModalTitle('编辑用户');
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName || '',
      status: user.status,
      roleIds: user.roles.map((r) => r.id),
    });
    setModalVisible(true);
  };

  // ---- Search with debounce ----
  const debouncedLoad = useMemo(
    () =>
      debounce(() => {
        queryRef.current.page = 1;
        setCurrentPage(1);
        loadUsers();
      }, 300),
    [loadUsers],
  );

  const handleSearch = (val: string) => {
    const normalized = normalizeInput(val);
    queryRef.current.keyword = normalized;
    setKeyword(normalized);
    debouncedLoad();
  };

  // ---- Column visibility ----
  const toggleColumn = useCallback((key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // ---- Table columns ----
  const columns = useMemo<TableColumn<UserItem>[]>(() => {
    const cols: TableColumn<UserItem>[] = [
      { key: 'id', title: 'ID', width: 70, align: 'center', sortable: true },
      { key: 'username', title: '用户名', width: 150, sortable: true },
      { key: 'displayName', title: '显示名', width: 150, sortable: true },
      {
        key: 'status',
        title: '状态',
        width: 100,
        align: 'center',
        render: (record) => (
          <Tag color={record.status === 0 ? 'green' : 'red'} size="sm">
            {record.status === 0 ? '正常' : '禁用'}
          </Tag>
        ),
      },
      {
        key: 'roles',
        title: '角色',
        width: 200,
        render: (record) => {
          const roles = record.roles;
          if (!roles || roles.length === 0)
            return <span className="text-slate-400 text-sm">无角色</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => (
                <Tag key={r.id} color="blue" size="sm">
                  {r.name}
                </Tag>
              ))}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        title: '创建时间',
        width: 180,
        sortable: true,
        render: (record) => (
          <span className="text-sm text-slate-600">
            {new Date(record.createdAt).toLocaleString('zh-CN')}
          </span>
        ),
      },
    ];

    if (canEdit || canDelete) {
      cols.push({
        key: 'actions',
        title: '操作',
        width: 180,
        align: 'center',
        fixed: 'right',
        render: (record) => (
          <div className="flex items-center justify-center gap-2">
            {canEdit && (
              <Tooltip content="更多操作">
                <Dropdown trigger="click" placement="bottom-end">
                  <Button size="sm" variant="ghost">
                    操作
                  </Button>
                  <DropdownMenu className="min-w-28">
                    <DropdownItem onClick={() => openEditModal(record)}>
                      编辑用户
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </Tooltip>
            )}
            {canDelete && (
              <Popconfirm
                title="确认删除用户"
                description={`将删除用户 ${record.username}，此操作不可撤销。`}
                okText="删除"
                cancelText="取消"
                okType="danger"
                placement="left"
                onConfirm={() => handleDelete(record)}>
                <Button size="sm" variant="ghost" color="danger">
                  删除
                </Button>
              </Popconfirm>
            )}
          </div>
        ),
      });
    }

    // Filter out hidden columns
    return cols.filter((c) => !hiddenColumns.has(c.key));
  }, [canEdit, canDelete, hiddenColumns]);

  // ---- Pagination ----
  const paginationConfig = useMemo(
    () => ({
      current: currentPage,
      pageSize,
      total,
      showSizeChanger: true,
      showTotal: true,
      pageSizeOptions: [10, 20, 50],
    }),
    [currentPage, pageSize, total],
  );

  const handlePageChange = (page: { current: number; pageSize: number }) => {
    if (page.pageSize !== queryRef.current.pageSize) {
      return;
    }

    queryRef.current.page = page.current;
    setCurrentPage(page.current);
    loadUsers();
  };

  const handlePageSizeChange = (current: number, nextPageSize: number) => {
    queryRef.current.pageSize = nextPageSize;
    queryRef.current.page = 1;
    setPageSize(nextPageSize);
    setCurrentPage(1);
    loadUsers();
  };

  // ---- Sort ----
  const handleSortChange = useCallback(
    (next: SortState) => {
      setSortState(next);
      queryRef.current.sortState = next;
      queryRef.current.page = 1;
      setCurrentPage(1);
      loadUsers();
    },
    [loadUsers],
  );

  // ---- Status filter ----
  const handleStatusFilter = useCallback(
    (value: TableToolbarFilterValue) => {
      const nextStatus = value === null || value === '' ? null : Number(value);
      setStatusFilter(nextStatus);
      queryRef.current.statusFilter = nextStatus;
      queryRef.current.page = 1;
      setCurrentPage(1);
      loadUsers();
    },
    [loadUsers],
  );

  const handleToolbarFiltersChange = useCallback(
    (filters: Record<string, TableToolbarFilterValue>) => {
      handleStatusFilter(filters.status ?? null);
    },
    [handleStatusFilter],
  );

  // ---- Selection ----
  const handleSelectionChange = (keys: (string | number)[]) => {
    setSelectedRowKeys(keys as number[]);
  };

  // ---- Role select options ----
  const roleOptions = useMemo(
    () => allRoles.map((r) => ({ label: r.name, value: r.id })),
    [allRoles],
  );

  const tableToolbar = useMemo(
    () => ({
      searchValue: keyword,
      searchPlaceholder: '搜索用户名或显示名...',
      filters: [
        {
          key: 'status',
          label: '状态',
          placeholder: '筛选状态',
          options: STATUS_FILTER_OPTIONS,
          value: statusFilter,
        },
      ],
      bulkActions: canDelete
        ? [
            {
              key: 'batch-delete',
              label: '批量删除',
              variant: 'outline' as const,
              onClick: (keys: (string | number)[]) =>
                handleBatchDelete(keys as number[]),
            },
          ]
        : undefined,
      selectedKeys: selectedRowKeys,
      selectedCount: selectedRowKeys.length,
    }),
    [canDelete, handleBatchDelete, keyword, selectedRowKeys, statusFilter],
  );

  const serverPaginationHint = useMemo(() => {
    if (total > pageSize) {
      return `列表采用服务端分页，当前页仅加载 ${pageSize} / ${total} 条结果。后端每页最多返回 100 条记录，请通过翻页或缩小筛选范围查看更多数据。`;
    }

    return '列表采用服务端分页，当前仅加载本页数据。后端每页最多返回 100 条记录。';
  }, [pageSize, total]);

  // ---- Form field helpers ----
  const setField = <K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        subtitle="管理平台用户账号、角色与权限"
        icon={<UsersIcon size={24} />}
        tags={[
          { label: '核心模块', color: 'blue' },
          { label: '运行中', color: 'green' },
        ]}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Popover
          trigger="click"
          placement="bottom-end"
          width={180}
          contentContent={
            <div className="space-y-2">
              {ALL_COLUMN_KEYS.filter(
                (k) => k !== 'actions' || canEdit || canDelete,
              ).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                  <Checkbox
                    checked={!hiddenColumns.has(key)}
                    onChange={() => toggleColumn(key)}
                  />
                  <span>{COLUMN_LABELS[key] || key}</span>
                </label>
              ))}
            </div>
          }>
          <Button variant="outline" size="sm">
            <span className="flex items-center gap-1">
              <SettingsIcon size={14} />
              列显隐
            </span>
          </Button>
        </Popover>
        <PermissionGuard code="user:view">
          <Button variant="outline" onClick={openExportModal}>
            <span className="flex items-center gap-1">
              <DownloadIcon size={16} />
              导出
            </span>
          </Button>
        </PermissionGuard>
        <PermissionGuard code="user:create">
          <Button color="primary" onClick={openCreateModal}>
            <span className="flex items-center gap-1">
              <UserPlusIcon size={16} />
              新增用户
            </span>
          </Button>
        </PermissionGuard>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {serverPaginationHint}
      </div>

      <DataTableWithToolbar
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={paginationConfig}
        rowSelection={{
          selectedRowKeys,
        }}
        sort={sortState}
        columnLockable
        rowKey="id"
        hoverable
        striped
        emptyText="暂无用户数据"
        toolbar={tableToolbar}
        onSearchChange={handleSearch}
        onSearch={handleSearch}
        onFiltersChange={handleToolbarFiltersChange}
        onPageChange={(current, nextPageSize) =>
          handlePageChange({ current, pageSize: nextPageSize })
        }
        onPageSizeChange={handlePageSizeChange}
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
      />

      {/* Create / Edit Modal */}
      <Modal
        open={modalVisible}
        title={modalTitle}
        showDefaultFooter
        okText="确定"
        cancelText="取消"
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}>
        <Form model={formData} labelWidth={88}>
          <FormItem label="用户名" name="username">
            <Input
              value={formData.username}
              placeholder="请输入用户名"
              disabled={!!editingId}
              onChange={(val) => setField('username', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="密码" name="password">
            <Input
              value={formData.password}
              type="password"
              placeholder={editingId ? '留空则不修改密码' : '请输入密码'}
              onChange={(val) => setField('password', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="显示名称" name="displayName">
            <Input
              value={formData.displayName}
              placeholder="请输入显示名称（选填）"
              onChange={(val) => setField('displayName', normalizeInput(val))}
            />
          </FormItem>
          {editingId && (
            <FormItem label="状态" name="status">
              <Select
                value={formData.status}
                options={[
                  { label: '正常', value: 0 },
                  { label: '禁用', value: 1 },
                ]}
                placeholder="请选择状态"
                onChange={(val) => setField('status', (val as number) ?? 0)}
              />
            </FormItem>
          )}
          <FormItem label="角色" name="roleIds">
            <Select
              value={formData.roleIds}
              options={roleOptions}
              placeholder="请选择角色（可多选）"
              multiple
              onChange={(val) => setField('roleIds', (val as number[]) ?? [])}
            />
          </FormItem>
        </Form>
      </Modal>

      {/* Export Modal */}
      <Modal
        open={exportModalVisible}
        title="导出用户数据"
        showDefaultFooter
        okText="导出"
        cancelText="取消"
        confirmLoading={exporting}
        onOk={handleExport}
        onCancel={() => setExportModalVisible(false)}>
        <Form labelWidth={88}>
          <FormItem label="导出格式">
            <Select
              value={exportFormat}
              options={FORMAT_OPTIONS}
              onChange={(val) => setExportFormat(val as ExportFormat)}
            />
          </FormItem>
          <FormItem label="导出字段">
            <div className="flex flex-wrap gap-3">
              {EXPORT_FIELD_OPTIONS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                  <Checkbox
                    checked={exportFields.includes(field.key)}
                    onChange={() => toggleExportField(field.key)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </FormItem>
        </Form>
      </Modal>

      {/* Batch Delete Confirm */}
      <Modal
        open={batchDeleteConfirmVisible}
        title="确认批量删除"
        showDefaultFooter
        okText="确认删除"
        cancelText="取消"
        onOk={confirmBatchDelete}
        onCancel={() => setBatchDeleteConfirmVisible(false)}
        role="alertdialog"
        aria-label={`确认批量删除 ${selectedRowKeys.length} 个用户`}>
        <p className="text-slate-600">
          确定要删除选中的
          <span className="font-semibold text-slate-800">
            {' '}
            {selectedRowKeys.length}{' '}
          </span>
          个用户吗？此操作不可撤销。
        </p>
      </Modal>
    </div>
  );
}

export default UsersPage;
