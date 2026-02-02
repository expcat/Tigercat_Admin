import { Card, Tag, Text } from '@expcat/tigercat-react';
import { SettingsIcon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';

type TagColor = 'blue' | 'green' | 'purple' | 'orange';

type SettingItem = {
  id: string;
  label: string;
  value: string;
  description: string;
  tag: string;
  tagColor: TagColor;
};

const itemCardClassName =
  'flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70';

const basicSettings: SettingItem[] = [
  {
    id: 'basic-name',
    label: '系统名称',
    value: 'Tigercat Admin',
    description: '后台管理系统展示名称',
    tag: '默认',
    tagColor: 'blue',
  },
  {
    id: 'basic-language',
    label: '默认语言',
    value: '中文（简体）',
    description: '界面默认显示语言',
    tag: '已启用',
    tagColor: 'green',
  },
  {
    id: 'basic-timezone',
    label: '时区',
    value: 'GMT+8',
    description: '日志与任务调度时区',
    tag: '同步',
    tagColor: 'purple',
  },
];

const securitySettings: SettingItem[] = [
  {
    id: 'security-password',
    label: '密码策略',
    value: '至少 8 位',
    description: '包含数字与大小写',
    tag: '强',
    tagColor: 'green',
  },
  {
    id: 'security-mfa',
    label: '多因素认证',
    value: '可选',
    description: '支持短信与邮箱验证',
    tag: '推荐',
    tagColor: 'blue',
  },
  {
    id: 'security-session',
    label: '会话超时',
    value: '30 分钟',
    description: '超时后需重新登录',
    tag: '生效中',
    tagColor: 'orange',
  },
];

const notificationSettings: SettingItem[] = [
  {
    id: 'notify-system',
    label: '系统通知',
    value: '站内消息',
    description: '关键事件实时提醒',
    tag: '开启',
    tagColor: 'green',
  },
  {
    id: 'notify-email',
    label: '邮件通知',
    value: 'admin@tigercat.io',
    description: '告警发送邮箱',
    tag: '启用',
    tagColor: 'blue',
  },
  {
    id: 'notify-webhook',
    label: 'Webhook',
    value: '未配置',
    description: '对接外部系统',
    tag: '待配置',
    tagColor: 'orange',
  },
];

const settingGroups = [
  { title: '基础', items: basicSettings },
  { title: '安全', items: securitySettings },
  { title: '通知', items: notificationSettings },
];

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="系统设置"
        subtitle="统一管理基础、安全与通知配置"
        icon={<SettingsIcon size={24} />}
        tags={[
          { label: '配置中心', color: 'blue' },
          { label: '已同步', color: 'green' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {settingGroups.map((group) => (
          <Card key={group.title} title={group.title}>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.id} className={itemCardClassName}>
                  <div className="flex-1 min-w-0">
                    <Text size="sm" weight="medium" className="text-slate-800">
                      {item.label}
                    </Text>
                    <Text size="xs" color="secondary" className="mt-1">
                      {item.description}
                    </Text>
                  </div>
                  <div className="text-right">
                    <Text size="sm" className="text-slate-700">
                      {item.value}
                    </Text>
                    <Tag color={item.tagColor} size="sm" className="mt-2">
                      {item.tag}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default SettingsPage;
