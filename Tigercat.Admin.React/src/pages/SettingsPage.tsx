import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Avatar,
  Card,
  Button,
  CropUpload,
  ColorPicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Segmented,
  Switch,
  Message,
  Text,
  Tag,
  Upload,
} from '@expcat/tigercat-react';
import type { UploadRequestOptions } from '@expcat/tigercat-core';
import { LogoIcon, SettingsIcon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { apiRequest, getAuthHeaders } from '../utils';
import { usePermission } from '../utils/permission';
import {
  SETTINGS_GROUP_LABELS,
  getColorPresets,
  getControl,
  getControlOptions,
  groupSettings,
} from '../utils/settings';
import type { SettingItem } from '../utils/types';

function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const { has: hasPerm } = usePermission();
  const canEdit = hasPerm('setting:edit');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest<SettingItem[]>('/api/settings', {
        headers: getAuthHeaders(),
      });
      setSettings(res.data);
      const values: Record<string, string> = {};
      for (const s of res.data) values[s.key] = s.value;
      setEditValues(values);
    } catch (e: any) {
      Message.error({ content: e.message || '加载设置失败', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
      if (avatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [logoPreviewUrl, avatarPreviewUrl]);

  const handleSave = async () => {
    if (!canEdit) return;
    const entries = settings
      .filter((s) => editValues[s.key] !== s.value)
      .map((s) => ({ key: s.key, value: editValues[s.key] ?? s.value }));
    if (entries.length === 0) return;
    try {
      setSaving(true);
      await apiRequest<SettingItem[]>('/api/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings: entries }),
      });
      Message.success({ content: '设置已保存', duration: 3000 });
      await fetchSettings();
    } catch (e: any) {
      Message.error({ content: e.message || '保存失败', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const groups = useMemo(() => groupSettings(settings), [settings]);
  const changedSettings = useMemo(
    () => settings.filter((s) => editValues[s.key] !== s.value),
    [settings, editValues],
  );
  const hasChanges = changedSettings.length > 0;
  const hasDefaultOverrides = useMemo(
    () => settings.some((s) => editValues[s.key] !== s.defaultValue),
    [settings, editValues],
  );

  const handleRestoreDefaults = () => {
    setEditValues(
      Object.fromEntries(settings.map((item) => [item.key, item.defaultValue])),
    );
    Message.success({
      content: '已恢复默认值，请确认保存修改',
      duration: 3000,
    });
  };

  const currentLogoUrl = logoPreviewUrl || editValues['site.logo'] || '';

  const updatePreviewUrl = (
    nextUrl: string,
    currentUrl: string | null,
    setUrl: (value: string | null) => void,
  ) => {
    if (currentUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(currentUrl);
    }
    setUrl(nextUrl);
  };

  const handleLogoUpload = ({
    file,
    onProgress,
    onSuccess,
  }: UploadRequestOptions) => {
    const nextUrl = URL.createObjectURL(file);
    updatePreviewUrl(nextUrl, logoPreviewUrl, setLogoPreviewUrl);
    onProgress?.(100);
    onSuccess?.({ previewUrl: nextUrl });
    Message.success({
      content:
        'Logo 上传场景已预留为本地预览，待接入媒体存储后可自动回填站点配置。',
      duration: 3000,
    });
  };

  const handleAvatarCropComplete = (result: { blob: Blob }) => {
    const nextUrl = URL.createObjectURL(result.blob);
    updatePreviewUrl(nextUrl, avatarPreviewUrl, setAvatarPreviewUrl);
    Message.success({
      content: '头像裁剪场景已预留为本地预览，待补用户头像字段后可持久化保存。',
      duration: 3000,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="系统设置"
        subtitle="管理系统基础配置与安全策略"
        icon={<SettingsIcon size={24} />}
        tags={[{ label: '配置中心', color: 'blue' }]}
      />

      {loading ? (
        <Card>
          <Text color="secondary">加载中…</Text>
        </Card>
      ) : (
        <>
          <Card title="媒体资源预留" className="overflow-hidden">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-dashed border-slate-300 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Text weight="bold">站点 Logo</Text>
                    <Text size="sm" color="secondary">
                      预留 Upload 场景，当前仍以 site.logo URL
                      作为持久化配置来源。
                    </Text>
                  </div>
                  <Tag color="blue" size="sm">
                    Upload
                  </Tag>
                </div>

                <div className="flex min-h-44 items-center justify-center rounded-2xl bg-slate-50 p-6">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt="站点 Logo 预览"
                      className="max-h-28 max-w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <LogoIcon size={56} />
                      <Text size="sm" color="secondary">
                        暂无 Logo，上传后会在这里显示本地预览
                      </Text>
                    </div>
                  )}
                </div>

                <Upload
                  accept="image/*"
                  disabled={!canEdit}
                  listType="picture-card"
                  showFileList={false}
                  maxSize={2 * 1024 * 1024}
                  customRequest={handleLogoUpload}
                />

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  当前持久化值：{editValues['site.logo'] || '未设置'}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-dashed border-slate-300 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Text weight="bold">用户头像</Text>
                    <Text size="sm" color="secondary">
                      预留 CropUpload
                      场景，当前仅做本地裁剪预览，后续再接用户头像字段。
                    </Text>
                  </div>
                  <Tag color="cyan" size="sm">
                    CropUpload
                  </Tag>
                </div>

                <div className="flex min-h-44 items-center justify-center rounded-2xl bg-slate-50 p-6">
                  <Avatar
                    src={avatarPreviewUrl ?? undefined}
                    className="h-24 w-24 text-lg">
                    管理
                  </Avatar>
                </div>

                <CropUpload
                  accept="image/*"
                  disabled={!canEdit}
                  maxSize={2 * 1024 * 1024}
                  modalTitle="裁剪头像"
                  onCropComplete={handleAvatarCropComplete}>
                  <Button variant="outline" disabled={!canEdit}>
                    选择头像并裁剪
                  </Button>
                </CropUpload>

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  当前头像仍使用用户名首字母回退展示，本次仅预留裁剪上传入口。
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groups.map(([prefix, items]) => (
              <Card
                key={prefix}
                title={SETTINGS_GROUP_LABELS[prefix] ?? prefix}>
                <div className="space-y-4">
                  {items.map((item) => {
                    const ctrl = getControl(item.key);
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Text size="sm" weight="medium">
                            {item.description ?? item.key}
                          </Text>
                          <Tag color="blue" size="sm">
                            {item.key}
                          </Tag>
                        </div>

                        {ctrl.type === 'switch' ? (
                          <Switch
                            checked={editValues[item.key] === 'true'}
                            onChange={(val) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [item.key]: String(val),
                              }))
                            }
                            disabled={!canEdit}
                          />
                        ) : ctrl.type === 'segmented' ? (
                          <Segmented
                            value={editValues[item.key] ?? ''}
                            options={getControlOptions(item.key)}
                            onChange={(val) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [item.key]: String(val),
                              }))
                            }
                            disabled={!canEdit}
                            block
                          />
                        ) : ctrl.type === 'select' ? (
                          <Select
                            value={editValues[item.key] ?? ''}
                            options={getControlOptions(item.key)}
                            onChange={(val) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [item.key]: String(val),
                              }))
                            }
                            placeholder={`选择 ${item.description ?? item.key}`}
                            disabled={!canEdit}
                            clearable={false}
                          />
                        ) : ctrl.type === 'color' ? (
                          <ColorPicker
                            value={editValues[item.key] || '#2563eb'}
                            presets={getColorPresets(item.key)}
                            onChange={(val) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [item.key]: val,
                              }))
                            }
                            disabled={!canEdit}
                          />
                        ) : ctrl.type === 'number' ? (
                          <InputNumber
                            value={Number(editValues[item.key]) || 0}
                            onChange={(val) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [item.key]: String(val ?? 0),
                              }))
                            }
                            min={ctrl.min}
                            max={ctrl.max}
                            step={ctrl.step}
                            disabled={!canEdit}
                          />
                        ) : (
                          <Input
                            value={editValues[item.key] ?? ''}
                            onChange={(val) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [item.key]: val,
                              }))
                            }
                            placeholder={`输入 ${item.key} 的值`}
                            disabled={!canEdit}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {canEdit && (
            <div className="flex flex-wrap justify-end gap-3">
              <Popconfirm
                title="恢复默认值"
                description="会将当前表单恢复为系统默认配置，提交后才会真正生效。"
                okText="恢复默认值"
                cancelText="取消"
                placement="top"
                onConfirm={handleRestoreDefaults}>
                <Button
                  variant="outline"
                  disabled={!hasDefaultOverrides || saving}>
                  恢复默认值
                </Button>
              </Popconfirm>
              <Button
                color="primary"
                onClick={() => setSaveConfirmOpen(true)}
                disabled={!hasChanges || saving}>
                {saving ? '保存中…' : '保存修改'}
              </Button>
            </div>
          )}

          <Modal
            open={saveConfirmOpen}
            title="确认保存设置"
            okText={saving ? '保存中…' : '确认保存'}
            cancelText="取消"
            onOk={handleSave}
            onCancel={() => setSaveConfirmOpen(false)}>
            <div className="space-y-4">
              <Text>
                将提交 {changedSettings.length}{' '}
                项设置变更。保存后会立即影响当前系统配置。
              </Text>
              <div className="flex flex-wrap gap-2">
                {changedSettings.map((item) => (
                  <Tag key={item.key} color="blue" size="sm">
                    {item.key}
                  </Tag>
                ))}
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

export default SettingsPage;
