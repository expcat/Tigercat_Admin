import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Avatar,
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
import { CropUpload } from '@expcat/tigercat-react/CropUpload';
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
  loadWorkbenchState,
  saveWorkbenchState,
  clearWorkbenchSelection,
} from '../utils';
import { uploadMediaBlob } from '../utils/media';
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
  avatarMediaId: number | null;
  avatarUrl: string | null;
  roleIds: number[];
};

const INITIAL_FORM: UserFormData = {
  username: '',
  password: '',
  displayName: '',
  status: 0,
  avatarMediaId: null,
  avatarUrl: null,
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
  const savedWorkbench = useMemo(
    () =>
      loadWorkbenchState('users', {
        queryState: { page: 1, pageSize: 10, status: null },
        selectedRowKeys: [],
        hiddenColumnKeys: [],
        exportState: {
          format: 'csv',
          fields: EXPORT_FIELD_OPTIONS.map((f) => f.key),
        },
      }),
    [],
  );
  const savedQuery = savedWorkbench.queryState;

  // ---- State ----
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState(savedQuery.keyword ?? '');
  const [currentPage, setCurrentPage] = useState(savedQuery.page ?? 1);
  const [pageSize, setPageSize] = useState(savedQuery.pageSize ?? 10);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>(
    savedWorkbench.selectedRowKeys.map(Number).filter((id) => Number.isFinite(id)),
  );

  // Sort state (controlled)
  const [sortState, setSortState] = useState<SortState>({
    key: savedQuery.sortBy ?? null,
    direction: savedQuery.sortOrder ?? null,
  });

  // Status filter
  const [statusFilter, setStatusFilter] = useState<number | null>(
    savedQuery.status === 0 || savedQuery.status === 1 ? savedQuery.status : null,
  );

  // Column visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => new Set(savedWorkbench.hiddenColumnKeys),
  );

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增用户');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingAvatarId, setEditingAvatarId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ ...INITIAL_FORM });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [batchDeleteConfirmVisible, setBatchDeleteConfirmVisible] =
    useState(false);
  const [batchStatusConfirm, setBatchStatusConfirm] = useState<{
    open: boolean;
    status: 0 | 1;
  }>({ open: false, status: 1 });

  // All roles for select
  const [allRoles, setAllRoles] = useState<RoleInfo[]>([]);

  // Export state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(
    savedWorkbench.exportState?.format ?? 'csv',
  );
  const [exportFields, setExportFields] = useState<string[]>(() =>
    savedWorkbench.exportState?.fields?.length
      ? savedWorkbench.exportState.fields
      : EXPORT_FIELD_OPTIONS.map((f) => f.key),
  );
  const [exporting, setExporting] = useState(false);

  // Ref to track current query state (avoids stale closures)
  const queryRef = useRef({
    page: currentPage,
    pageSize,
    keyword,
    sortState,
    statusFilter,
  });

  // ---- Permission checks ----
  const canEdit = hasPerm('user:edit');
  const canDelete = hasPerm('user:delete');

  const persistQuery = useCallback((next: Partial<typeof queryRef.current>) => {
    queryRef.current = { ...queryRef.current, ...next };
    saveWorkbenchState('users', {
      queryState: {
        page: queryRef.current.page,
        pageSize: queryRef.current.pageSize,
        keyword: queryRef.current.keyword,
        sortBy: queryRef.current.sortState.key ?? null,
        sortOrder: queryRef.current.sortState.direction ?? null,
        status: queryRef.current.statusFilter,
      },
    });
  }, []);

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
        if (formData.avatarMediaId !== editingAvatarId) {
          body.avatarMediaId = formData.avatarMediaId ?? 0;
        }
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
      setSelectedRowKeys((prev) => {
        const next = prev.filter((k) => k !== userId);
        saveWorkbenchState('users', { selectedRowKeys: next });
        return next;
      });
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
    const next = keys.map(Number).filter((id) => Number.isFinite(id));
    setSelectedRowKeys(next);
    saveWorkbenchState('users', { selectedRowKeys: next });
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
      clearWorkbenchSelection('users');
      loadUsers();
    } catch (e: any) {
      Message.error({ content: e.message || '批量删除失败', duration: 3000 });
    }
  };

  const handleBatchStatus = (status: 0 | 1, keys = selectedRowKeys) => {
    if (keys.length === 0) {
      Message.error({ content: '请选择要更新状态的用户', duration: 3000 });
      return;
    }

    const next = keys.map(Number).filter((id) => Number.isFinite(id));
    setSelectedRowKeys(next);
    saveWorkbenchState('users', { selectedRowKeys: next });
    setBatchStatusConfirm({ open: true, status });
  };

  const confirmBatchStatus = async () => {
    try {
      const res = await apiRequest<MessageResult>('/api/users/batch-status', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ids: selectedRowKeys,
          status: batchStatusConfirm.status,
        }),
      });
      Message.success({
        content: res.data.message || '批量状态更新成功',
        duration: 3000,
      });
      setBatchStatusConfirm((prev) => ({ ...prev, open: false }));
      setSelectedRowKeys([]);
      clearWorkbenchSelection('users');
      loadUsers();
    } catch (e: any) {
      Message.error({
        content: e.message || '批量状态更新失败',
        duration: 3000,
      });
    }
  };

  // ---- Export ----
  const openExportModal = () => setExportModalVisible(true);

  const toggleExportField = (key: string) => {
    setExportFields((prev) => {
      const next = prev.includes(key)
        ? prev.filter((f) => f !== key)
        : [...prev, key];
      saveWorkbenchState('users', {
        exportState: { format: exportFormat, fields: next },
      });
      return next;
    });
  };

  const handleExportFormatChange = (format: ExportFormat) => {
    setExportFormat(format);
    saveWorkbenchState('users', {
      exportState: { format, fields: exportFields },
    });
  };

  const handleExport = async () => {
    if (exportFields.length === 0) {
      Message.error({ content: '请至少选择一个导出字段', duration: 3000 });
      return;
    }
    if (total === 0) {
      Message.error({ content: '当前筛选没有可导出的结果', duration: 3000 });
      return;
    }
    setExporting(true);
    try {
      const { keyword: kw, sortState: ss, statusFilter: sf } = queryRef.current;
      await exportData({
        entity: 'users',
        format: exportFormat,
        fields: exportFields,
        query: {
          keyword: kw,
          sortBy: ss.key ?? undefined,
          sortOrder: ss.direction ?? undefined,
          status: sf,
        },
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
    setEditingAvatarId(null);
    setModalTitle('新增用户');
    setFormData({ ...INITIAL_FORM });
    setModalVisible(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingId(user.id);
    setEditingAvatarId(user.avatarMediaId);
    setModalTitle('编辑用户');
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName || '',
      status: user.status,
      avatarMediaId: user.avatarMediaId,
      avatarUrl: user.avatarUrl,
      roleIds: user.roles.map((r) => r.id),
    });
    setModalVisible(true);
  };

  const handleAvatarCropComplete = async (result: { blob: Blob }) => {
    if (!editingId) return;
    try {
      setAvatarUploading(true);
      const media = await uploadMediaBlob(
        result.blob,
        `avatar-${editingId}.png`,
        'avatar',
      );
      setFormData((prev) => ({
        ...prev,
        avatarMediaId: media.id,
        avatarUrl: media.url,
      }));
      Message.success({ content: '头像已上传，请保存用户资料', duration: 3000 });
    } catch (e: any) {
      Message.error({ content: e.message || '头像上传失败', duration: 3000 });
    } finally {
      setAvatarUploading(false);
    }
  };

  // ---- Search with debounce ----
  const debouncedLoad = useMemo(
    () =>
      debounce(() => {
        persistQuery({ page: 1 });
        setCurrentPage(1);
        loadUsers();
      }, 300),
    [loadUsers, persistQuery],
  );

  const handleSearch = (val: string) => {
    const normalized = normalizeInput(val);
    persistQuery({ keyword: normalized });
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
      saveWorkbenchState('users', {
        hiddenColumnKeys: Array.from(next),
      });
      return next;
    });
  }, []);

  // ---- Table columns ----
  const columns = useMemo<TableColumn<UserItem>[]>(() => {
    const cols: TableColumn<UserItem>[] = [
      { key: 'id', title: 'ID', width: 70, align: 'center', sortable: true },
      {
        key: 'username',
        title: '用户名',
        width: 190,
        sortable: true,
        render: (record) => (
          <div className="flex items-center gap-2">
            <Avatar src={record.avatarUrl ?? undefined} className="h-8 w-8">
              {record.username.charAt(0).toUpperCase()}
            </Avatar>
            <span>{record.username}</span>
          </div>
        ),
      },
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
            return <span className="p2-text-secondary text-sm">无角色</span>;
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
          <span className="p2-text-secondary text-sm">
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
                  <DropdownMenu className="w-28 max-w-[calc(100vw-2rem)]">
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

    persistQuery({ page: page.current });
    setCurrentPage(page.current);
    loadUsers();
  };

  const handlePageSizeChange = (current: number, nextPageSize: number) => {
    persistQuery({ pageSize: nextPageSize, page: 1 });
    setPageSize(nextPageSize);
    setCurrentPage(1);
    loadUsers();
  };

  // ---- Sort ----
  const handleSortChange = useCallback(
    (next: SortState) => {
      setSortState(next);
      persistQuery({ sortState: next, page: 1 });
      setCurrentPage(1);
      loadUsers();
    },
    [loadUsers, persistQuery],
  );

  // ---- Status filter ----
  const handleStatusFilter = useCallback(
    (value: TableToolbarFilterValue) => {
      const nextStatus = value === null || value === '' ? null : Number(value);
      setStatusFilter(nextStatus);
      persistQuery({ statusFilter: nextStatus, page: 1 });
      setCurrentPage(1);
      loadUsers();
    },
    [loadUsers, persistQuery],
  );

  const handleToolbarFiltersChange = useCallback(
    (filters: Record<string, TableToolbarFilterValue>) => {
      handleStatusFilter(filters.status ?? null);
    },
    [handleStatusFilter],
  );

  // ---- Selection ----
  const handleSelectionChange = (keys: (string | number)[]) => {
    const next = keys.map(Number).filter((id) => Number.isFinite(id));
    setSelectedRowKeys(next);
    saveWorkbenchState('users', { selectedRowKeys: next });
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
      bulkActions:
        canEdit || canDelete
          ? [
              ...(canEdit
                ? [
                    {
                      key: 'batch-enable',
                      label: '批量启用',
                      variant: 'outline' as const,
                      onClick: (keys: (string | number)[]) =>
                        handleBatchStatus(0, keys as number[]),
                    },
                    {
                      key: 'batch-disable',
                      label: '批量禁用',
                      variant: 'outline' as const,
                      onClick: (keys: (string | number)[]) =>
                        handleBatchStatus(1, keys as number[]),
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      key: 'batch-delete',
                      label: '批量删除',
                      variant: 'outline' as const,
                      onClick: (keys: (string | number)[]) =>
                        handleBatchDelete(keys as number[]),
                    },
                  ]
                : []),
            ]
          : undefined,
      selectedKeys: selectedRowKeys,
      selectedCount: selectedRowKeys.length,
    }),
    [canDelete, canEdit, handleBatchDelete, keyword, selectedRowKeys, statusFilter],
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
                  className="p2-checkbox-row text-sm">
                  <Checkbox
                    checked={!hiddenColumns.has(key)}
                    onChange={() => toggleColumn(key)}
                  />
                  <span className="p2-checkbox-label">
                    {COLUMN_LABELS[key] || key}
                  </span>
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

      <div className="p2-muted-panel px-4 py-3 text-sm">
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
        <div className="p2-modal-scroll">
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
          {editingId && (
            <FormItem label="头像" name="avatarMediaId">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar src={formData.avatarUrl ?? undefined} className="h-14 w-14">
                  {formData.username.charAt(0).toUpperCase()}
                </Avatar>
                <CropUpload
                  accept="image/*"
                  maxSize={2 * 1024 * 1024}
                  modalTitle="裁剪头像"
                  onCropComplete={handleAvatarCropComplete}>
                  <Button variant="outline" disabled={avatarUploading}>
                    {avatarUploading ? '上传中…' : '选择头像并裁剪'}
                  </Button>
                </CropUpload>
                {formData.avatarMediaId && (
                  <Button
                    variant="ghost"
                    color="danger"
                    disabled={avatarUploading}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        avatarMediaId: null,
                        avatarUrl: null,
                      }))
                    }>
                    移除头像
                  </Button>
                )}
              </div>
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
        </div>
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
        <div className="p2-modal-scroll">
        <Form labelWidth={88}>
          <FormItem label="导出格式">
            <Select
              value={exportFormat}
              options={FORMAT_OPTIONS}
              onChange={(val) => handleExportFormatChange(val as ExportFormat)}
            />
          </FormItem>
          <FormItem label="导出字段">
            <div className="flex flex-wrap gap-3">
              {EXPORT_FIELD_OPTIONS.map((field) => (
                <label
                  key={field.key}
                  className="p2-checkbox-row text-sm">
                  <Checkbox
                    checked={exportFields.includes(field.key)}
                    onChange={() => toggleExportField(field.key)}
                  />
                  <span className="p2-checkbox-label">{field.label}</span>
                </label>
              ))}
            </div>
          </FormItem>
        </Form>
        </div>
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
        <p className="p2-text-secondary">
          确定要删除选中的
          <span className="p2-text-primary font-semibold">
            {' '}
            {selectedRowKeys.length}{' '}
          </span>
          个用户吗？此操作不可撤销。
        </p>
      </Modal>

      <Modal
        open={batchStatusConfirm.open}
        title={batchStatusConfirm.status === 0 ? '确认批量启用' : '确认批量禁用'}
        showDefaultFooter
        okText={batchStatusConfirm.status === 0 ? '确认启用' : '确认禁用'}
        cancelText="取消"
        onOk={confirmBatchStatus}
        onCancel={() => setBatchStatusConfirm((prev) => ({ ...prev, open: false }))}
        role="alertdialog"
        aria-label={`确认批量${batchStatusConfirm.status === 0 ? '启用' : '禁用'} ${selectedRowKeys.length} 个用户`}>
        <p className="p2-text-secondary">
          将选中的
          <span className="p2-text-primary font-semibold">
            {' '}
            {selectedRowKeys.length}{' '}
          </span>
          个用户设为{batchStatusConfirm.status === 0 ? '正常' : '禁用'}状态。
        </p>
      </Modal>
    </div>
  );
}

export default UsersPage;
