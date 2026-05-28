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
  Checkbox,
  Tag,
  Tree,
  Tooltip,
  Message,
  Popover,
} from '@expcat/tigercat-react';
import type { TableColumn, SortState } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { PermissionGuard } from '../components/PermissionGuard';
import {
  ShieldIcon,
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
  PermissionInfo,
  RoleUserInfo,
  RoleItem,
  PagedResult,
  MessageResult,
} from '../utils/types';
import {
  buildPermissionTreeData,
} from '../utils/permission-helpers';

type RoleFormData = {
  name: string;
  description: string;
  permissionIds: number[];
};

const INITIAL_FORM: RoleFormData = {
  name: '',
  description: '',
  permissionIds: [],
};

const EXPORT_FIELD_OPTIONS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '角色名称' },
  { key: 'description', label: '描述' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'permissions', label: '权限' },
  { key: 'userCount', label: '用户数' },
] as const;

const FORMAT_OPTIONS = [
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' },
  { label: 'XLSX', value: 'xlsx' },
];

const ALL_COLUMN_KEYS = [
  'id',
  'name',
  'description',
  'permissions',
  'users',
  'createdAt',
  'actions',
] as const;

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  name: '角色名称',
  description: '描述',
  permissions: '权限数',
  users: '关联用户',
  createdAt: '创建时间',
  actions: '操作',
};

function RolesPage() {
  const { has: hasPerm } = usePermission();

  // ---- State ----
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Sort state (controlled)
  const [sortState, setSortState] = useState<SortState>({
    key: null,
    direction: null,
  });

  // Column visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Modal state — create / edit
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增角色');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({ ...INITIAL_FORM });

  // Permission configuration modal
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [permConfigRole, setPermConfigRole] = useState<RoleItem | null>(null);
  const [permConfigIds, setPermConfigIds] = useState<number[]>([]);

  // All available permissions for select
  const [allPermissions, setAllPermissions] = useState<PermissionInfo[]>([]);

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
  });

  // ---- Permission checks ----
  const canEdit = hasPerm('role:edit');
  const canDelete = hasPerm('role:delete');

  // ---- API calls ----
  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const {
        page,
        pageSize: ps,
        keyword: kw,
        sortState: ss,
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
      const res = await apiRequest<PagedResult<RoleItem>>(
        `/api/roles?${params}`,
        {
          headers: getAuthHeaders(),
        },
      );
      setRoles(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      Message.error({
        content: e.message || '加载角色列表失败',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await apiRequest<PermissionInfo[]>('/api/roles/permissions', {
        headers: getAuthHeaders(),
      });
      setAllPermissions(res.data ?? []);
    } catch {
      setAllPermissions([]);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Form submit (create / update) ----
  const handleSubmit = async () => {
    if (!modalVisible) return;

    if (!formData.name.trim()) {
      Message.error({ content: '请输入角色名称', duration: 3000 });
      return;
    }
    if (formData.name.trim().length < 2 || formData.name.trim().length > 50) {
      Message.error({
        content: '角色名称长度需在 2-50 个字符之间',
        duration: 3000,
      });
      return;
    }
    if (formData.description && formData.description.length > 200) {
      Message.error({ content: '描述长度不能超过 200 字符', duration: 3000 });
      return;
    }

    try {
      if (editingId) {
        await apiRequest(`/api/roles/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description || null,
            permissionIds: formData.permissionIds,
          }),
        });
        Message.success({ content: '角色更新成功', duration: 3000 });
      } else {
        await apiRequest('/api/roles', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description || null,
            permissionIds: formData.permissionIds,
          }),
        });
        Message.success({ content: '角色创建成功', duration: 3000 });
      }
      setModalVisible(false);
      loadRoles();
    } catch (e: any) {
      Message.error({ content: e.message || '操作失败', duration: 3000 });
    }
  };

  // ---- Delete ----
  const handleDelete = async (role: RoleItem) => {
    try {
      await apiRequest<MessageResult>(`/api/roles/${role.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      Message.success({ content: '删除成功', duration: 3000 });
      loadRoles();
    } catch (e: any) {
      Message.error({ content: e.message || '删除失败', duration: 3000 });
    }
  };

  // ---- Permission configuration ----
  const openPermModal = (role: RoleItem) => {
    setPermConfigRole(role);
    setPermConfigIds(role.permissions.map((p) => p.id));
    setPermModalVisible(true);
  };

  const handlePermSubmit = async () => {
    if (!permConfigRole) return;
    try {
      await apiRequest(`/api/roles/${permConfigRole.id}/permissions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permissionIds: permConfigIds }),
      });
      Message.success({ content: '权限配置已保存', duration: 3000 });
      setPermModalVisible(false);
      setPermConfigRole(null);
      loadRoles();
    } catch (e: any) {
      Message.error({
        content: e.message || '权限配置失败',
        duration: 3000,
      });
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
        entity: 'roles',
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
    setModalTitle('新增角色');
    setFormData({ ...INITIAL_FORM });
    setModalVisible(true);
  };

  const openEditModal = (role: RoleItem) => {
    setEditingId(role.id);
    setModalTitle('编辑角色');
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionIds: role.permissions.map((p) => p.id),
    });
    setModalVisible(true);
  };

  // ---- Search with debounce ----
  const debouncedLoad = useMemo(
    () =>
      debounce(() => {
        queryRef.current.page = 1;
        setCurrentPage(1);
        loadRoles();
      }, 300),
    [loadRoles],
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
  const permissionOptions = useMemo(
    () =>
      allPermissions.map((p) => ({
        label: p.description ? `${p.code}(${p.description})` : p.code,
        value: p.id,
      })),
    [allPermissions],
  );

  const permissionTreeData = useMemo(
    () => buildPermissionTreeData(allPermissions),
    [allPermissions],
  );

  const handlePermTreeCheck = useCallback(
    (checkedKeys: (string | number)[]) => {
      setPermConfigIds(
        checkedKeys.filter((key): key is number => typeof key === 'number'),
      );
    },
    [],
  );

  const columns = useMemo<TableColumn<RoleItem>[]>(() => {
    const cols: TableColumn<RoleItem>[] = [
      { key: 'id', title: 'ID', width: 70, align: 'center', sortable: true },
      { key: 'name', title: '角色名称', width: 150, sortable: true },
      {
        key: 'description',
        title: '描述',
        width: 200,
        render: (record) => (
          <span className="text-sm text-slate-600">
            {record.description || '-'}
          </span>
        ),
      },
      {
        key: 'permissions',
        title: '权限数',
        width: 100,
        align: 'center',
        render: (record) => (
          <Tag color="blue" size="sm">
            {record.permissions.length} 项
          </Tag>
        ),
      },
      {
        key: 'users',
        title: '关联用户',
        width: 100,
        align: 'center',
        render: (record) => (
          <Tag color="purple" size="sm">
            {record.users.length} 人
          </Tag>
        ),
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
                      编辑角色
                    </DropdownItem>
                    <DropdownItem onClick={() => openPermModal(record)}>
                      权限配置
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </Tooltip>
            )}
            {canDelete && (
              <Popconfirm
                title="确认删除角色"
                description={`将删除角色 ${record.name}，此操作不可撤销。`}
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
    loadRoles();
  };

  const handlePageSizeChange = (_current: number, nextPageSize: number) => {
    queryRef.current.pageSize = nextPageSize;
    queryRef.current.page = 1;
    setPageSize(nextPageSize);
    setCurrentPage(1);
    loadRoles();
  };

  // ---- Sort ----
  const handleSortChange = useCallback(
    (next: SortState) => {
      setSortState(next);
      queryRef.current.sortState = next;
      queryRef.current.page = 1;
      setCurrentPage(1);
      loadRoles();
    },
    [loadRoles],
  );

  // ---- Form field helpers ----
  const setField = <K extends keyof RoleFormData>(
    field: K,
    value: RoleFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const tableToolbar = useMemo(
    () => ({
      searchValue: keyword,
      searchPlaceholder: '搜索角色名称或描述...',
    }),
    [keyword],
  );

  const serverPaginationHint = useMemo(() => {
    if (total > pageSize) {
      return `列表采用服务端分页，当前页仅加载 ${pageSize} / ${total} 条结果。后端每页最多返回 100 条记录，请通过翻页或缩小筛选范围查看更多数据。`;
    }

    return '列表采用服务端分页，当前仅加载本页数据。后端每页最多返回 100 条记录。';
  }, [pageSize, total]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="角色管理"
        subtitle="维护平台角色与权限配置"
        icon={<ShieldIcon size={24} />}
        tags={[
          { label: '权限中心', color: 'blue' },
          { label: '已启用', color: 'green' },
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
        <PermissionGuard code="role:view">
          <Button variant="outline" onClick={openExportModal}>
            <span className="flex items-center gap-1">
              <DownloadIcon size={16} />
              导出
            </span>
          </Button>
        </PermissionGuard>
        <PermissionGuard code="role:create">
          <Button color="primary" onClick={openCreateModal}>
            <span className="flex items-center gap-1">
              <UserPlusIcon size={16} />
              新增角色
            </span>
          </Button>
        </PermissionGuard>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {serverPaginationHint}
      </div>

      <DataTableWithToolbar
        columns={columns}
        dataSource={roles}
        loading={loading}
        pagination={paginationConfig}
        sort={sortState}
        columnLockable
        rowKey="id"
        hoverable
        striped
        emptyText="暂无角色数据"
        toolbar={tableToolbar}
        onSearchChange={handleSearch}
        onSearch={handleSearch}
        onPageChange={(current, nextPageSize) =>
          handlePageChange({ current, pageSize: nextPageSize })
        }
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
      />

      {/* Create / Edit Modal */}
      <Modal
        open={modalVisible}
        title={modalTitle}
        okText="确定"
        cancelText="取消"
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}>
        <Form model={formData} labelWidth={88}>
          <FormItem label="角色名称" name="name">
            <Input
              value={formData.name}
              placeholder="请输入角色名称"
              onChange={(val) => setField('name', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="描述" name="description">
            <Input
              value={formData.description}
              placeholder="请输入角色描述（选填）"
              onChange={(val) => setField('description', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="权限" name="permissionIds">
            <Select
              value={formData.permissionIds}
              options={permissionOptions}
              placeholder="请选择权限（可多选）"
              multiple
              onChange={(val) =>
                setField('permissionIds', (val as number[]) ?? [])
              }
            />
          </FormItem>
        </Form>
      </Modal>

      {/* Permission Configuration Modal */}
      <Modal
        open={permModalVisible}
        title={`权限配置 — ${permConfigRole?.name ?? ''}`}
        okText="保存"
        cancelText="取消"
        onOk={handlePermSubmit}
        onCancel={() => setPermModalVisible(false)}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>按分组勾选权限，保存时仍提交扁平 permissionIds。</span>
            <Tag color="blue" size="sm">
              {permConfigIds.length} / {allPermissions.length}
            </Tag>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 p-3">
            <Tree
              treeData={permissionTreeData}
              checkable
              blockNode
              searchable
              defaultExpandAll
              checkStrategy="child"
              checkedKeys={permConfigIds}
              emptyText="暂无可配置的权限"
              ariaLabel="角色权限树"
              onCheck={handlePermTreeCheck}
            />
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        open={exportModalVisible}
        title="导出角色数据"
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
    </div>
  );
}

export default RolesPage;
