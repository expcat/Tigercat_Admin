import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Message,
  Text,
  Tag,
} from '@expcat/tigercat-react';
import { SettingsIcon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { apiRequest, getAuthHeaders } from '../utils';
import { usePermission } from '../utils/permission';
import type { SettingItem } from '../utils/types';

const GROUP_LABELS: Record<string, string> = {
  site: '站点设置',
  auth: '认证安全',
};

function groupSettings(items: SettingItem[]): [string, SettingItem[]][] {
  const map: Record<string, SettingItem[]> = {};
  for (const item of items) {
    const prefix = item.key.split('.')[0] || 'other';
    (map[prefix] ??= []).push(item);
  }
  return Object.entries(map);
}

function SettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const groups = groupSettings(settings);
  const hasChanges = settings.some((s) => editValues[s.key] !== s.value);

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groups.map(([prefix, items]) => (
              <Card key={prefix} title={GROUP_LABELS[prefix] ?? prefix}>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Text size="sm" weight="medium">
                          {item.description ?? item.key}
                        </Text>
                        <Tag color="blue" size="sm">
                          {item.key}
                        </Tag>
                      </div>
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
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <Button
                color="primary"
                onClick={handleSave}
                disabled={!hasChanges || saving}>
                {saving ? '保存中…' : '保存修改'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SettingsPage;
