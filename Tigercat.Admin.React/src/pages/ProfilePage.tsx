import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Text, Tag, Button, Avatar, Switch, Message } from '@expcat/tigercat-react';
import { Tabs } from '@expcat/tigercat-react/Tabs';
import { TabPane } from '@expcat/tigercat-react/TabPane';
import { Descriptions } from '@expcat/tigercat-react/Descriptions';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Rate } from '@expcat/tigercat-react/Rate';
import { QRCode } from '@expcat/tigercat-react/QRCode';
import { Signature } from '@expcat/tigercat-react/Signature';
import { ColorSwatch } from '@expcat/tigercat-react/ColorSwatch';
import { Timeline } from '@expcat/tigercat-react/Timeline';
import { List } from '@expcat/tigercat-react/List';
import { Badge } from '@expcat/tigercat-react/Badge';
import { Divider } from '@expcat/tigercat-react/Divider';
import { Space } from '@expcat/tigercat-react/Space';
import { Radio } from '@expcat/tigercat-react/Radio';
import { RadioGroup } from '@expcat/tigercat-react/RadioGroup';
import { Textarea } from '@expcat/tigercat-react/Textarea';
import { Slider } from '@expcat/tigercat-react/Slider';
import { DatePicker } from '@expcat/tigercat-react/DatePicker';
import { TimePicker } from '@expcat/tigercat-react/TimePicker';
import type {
  DescriptionsItem,
  TimelineItem,
  ListItem,
  DatePickerSingleModelValue,
  TimePickerRangeValue,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { UserIcon } from '../components/Icons';

const swatchColors = ['#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f97316', '#14b8a6'];
const fontMarks: Record<number, string> = { 12: '小', 16: '中', 20: '大' };
const totpUri =
  'otpauth://totp/TigercatAdmin:admin?secret=JBSWY3DPEHPK3PXP&issuer=Tigercat';

const devices: ListItem[] = [
  { key: 'd1', title: 'MacBook Pro · Chrome', description: '上海 · 当前设备 · 192.168.1.20' },
  { key: 'd2', title: 'iPhone 15 · Safari', description: '上海 · 移动网络 · 10 分钟前活跃' },
  { key: 'd3', title: 'Windows · Edge', description: '北京 · 3 天前活跃' },
];

const loginHistory: TimelineItem[] = [
  { key: 'h1', label: '2026-06-29 09:12', content: '登录成功 · MacBook Pro · Chrome', color: '#22c55e' },
  { key: 'h2', label: '2026-06-28 18:40', content: '退出登录 · MacBook Pro', color: '#64748b' },
  { key: 'h3', label: '2026-06-26 08:05', content: '登录成功 · iPhone 15 · Safari', color: '#22c55e' },
  { key: 'h4', label: '2026-06-22 21:30', content: '异地登录提醒 · 北京 · Edge', color: '#f97316' },
];

function ProfilePage() {
  const { username: rawName } = useOutletContext<{ username?: string }>();
  const username = rawName ?? 'Admin';
  const avatarInitial = username.charAt(0).toUpperCase();

  const profile = {
    email: 'admin@tigercat.dev',
    role: '超级管理员',
    department: '平台研发部',
    registeredAt: '2025-08-12',
    lastLoginAt: '2026-06-29 09:12',
  };

  const basicItems: DescriptionsItem[] = [
    { label: '用户名', content: username },
    { label: '邮箱', content: profile.email },
    { label: '角色', content: profile.role },
    { label: '部门', content: profile.department },
    { label: '注册时间', content: profile.registeredAt },
    { label: '最近登录', content: profile.lastLoginAt },
  ];

  // 安全设置
  const [security, setSecurity] = useState({
    twoFactor: true,
    loginAlert: true,
    remoteProtect: false,
  });

  // 偏好
  const [density, setDensity] = useState<string | number>('comfortable');
  const [themeColor, setThemeColor] = useState('#3b82f6');
  const [fontSize, setFontSize] = useState(14);
  const [birthday, setBirthday] = useState<DatePickerSingleModelValue>(null);
  const [quietHours, setQuietHours] = useState<TimePickerRangeValue>(['22:00', '07:00']);
  const [bio, setBio] = useState('负责 Tigercat 后台平台的整体架构与组件治理。');
  const [emailDigest, setEmailDigest] = useState(true);

  const handleSave = (scope: string) => {
    Message.success({ content: `${scope}已保存（演示）`, duration: 2400 });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UserIcon size={24} />}
        title="个人中心"
        subtitle="管理你的资料、安全选项、偏好与登录设备"
        tags={[
          { label: '已认证', variant: 'success' },
          { label: '管理员', variant: 'primary' },
        ]}
      />

      <Tabs defaultActiveKey="basic">
        {/* 基本资料 */}
        <TabPane tabKey="basic" label="基本资料">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Badge type="dot" variant="success">
                    <Avatar
                      size="xl"
                      className="font-bold bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white">
                      {avatarInitial}
                    </Avatar>
                  </Badge>
                  <div className="min-w-0">
                    <Text size="lg" weight="bold" className="p2-text-primary">
                      {username}
                    </Text>
                    <div className="mt-1 flex items-center gap-2">
                      <Tag variant="primary" size="sm">
                        {profile.role}
                      </Tag>
                      <Text size="sm" color="secondary">
                        {profile.department}
                      </Text>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Text size="sm" color="secondary">
                    账号活跃度
                  </Text>
                  <Rate value={4} disabled allowHalf />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <Statistic title="登录次数" value={1280} groupSeparator />
              </Card>
              <Card>
                <Statistic title="积分" value={4860} suffix="分" />
              </Card>
              <Card>
                <Statistic title="连续在线" value={36} suffix="天" />
              </Card>
            </div>

            <Card title="资料详情">
              <Descriptions items={basicItems} column={{ xs: 1, sm: 2, lg: 3 }} bordered colon />
            </Card>
          </div>
        </TabPane>

        {/* 安全设置 */}
        <TabPane tabKey="security" label="安全设置">
          <div className="space-y-6">
            <Card title="安全选项">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <Text weight="medium">两步验证</Text>
                    <Text size="sm" color="secondary" className="block">
                      登录时额外校验身份验证器动态码
                    </Text>
                  </div>
                  <Switch
                    checked={security.twoFactor}
                    onChange={(v) => setSecurity((s) => ({ ...s, twoFactor: v }))}
                  />
                </div>
                <Divider spacing="sm" />
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <Text weight="medium">登录提醒</Text>
                    <Text size="sm" color="secondary" className="block">
                      新设备登录时发送邮件通知
                    </Text>
                  </div>
                  <Switch
                    checked={security.loginAlert}
                    onChange={(v) => setSecurity((s) => ({ ...s, loginAlert: v }))}
                  />
                </div>
                <Divider spacing="sm" />
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <Text weight="medium">异地登录保护</Text>
                    <Text size="sm" color="secondary" className="block">
                      非常用地登录时需二次确认
                    </Text>
                  </div>
                  <Switch
                    checked={security.remoteProtect}
                    onChange={(v) => setSecurity((s) => ({ ...s, remoteProtect: v }))}
                  />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="两步验证绑定">
                <div className="flex flex-col items-center gap-3">
                  <QRCode value={totpUri} size={160} />
                  <MutedPanel description="使用身份验证器 App 扫描二维码完成绑定（演示数据，不会真正生效）。" />
                </div>
              </Card>

              <Card title="电子签名">
                <Signature height={160} clearable />
                <Space className="mt-3">
                  <Button onClick={() => handleSave('电子签名')}>保存签名</Button>
                </Space>
              </Card>
            </div>
          </div>
        </TabPane>

        {/* 偏好 */}
        <TabPane tabKey="preference" label="偏好">
          <Card title="界面与通知偏好">
            <div className="space-y-6">
              <div>
                <Text weight="medium" className="mb-2 block">
                  界面密度
                </Text>
                <RadioGroup value={density} onChange={(v) => setDensity(v)}>
                  <Space>
                    <Radio value="compact">紧凑</Radio>
                    <Radio value="comfortable">适中</Radio>
                    <Radio value="loose">宽松</Radio>
                  </Space>
                </RadioGroup>
              </div>

              <div>
                <Text weight="medium" className="mb-2 block">
                  主题色
                </Text>
                <ColorSwatch value={themeColor} onChange={(v) => setThemeColor(v)} colors={swatchColors} columns={6} />
              </div>

              <div>
                <Text weight="medium" className="mb-2 block">
                  界面字号
                </Text>
                <div className="max-w-sm">
                  <Slider
                    value={fontSize}
                    onChange={(v) => setFontSize(typeof v === 'number' ? v : v[0])}
                    min={12}
                    max={20}
                    step={1}
                    marks={fontMarks}
                    tooltip
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Text weight="medium" className="mb-2 block">
                    生日
                  </Text>
                  <DatePicker value={birthday} onChange={(d) => setBirthday(d)} placeholder="选择生日" clearable />
                </div>
                <div>
                  <Text weight="medium" className="mb-2 block">
                    免打扰时段
                  </Text>
                  <TimePicker range value={quietHours} onChange={(t) => setQuietHours(t)} showSeconds={false} />
                </div>
              </div>

              <div>
                <Text weight="medium" className="mb-2 block">
                  个人简介
                </Text>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={200}
                  showCount
                  placeholder="介绍一下你自己"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Text weight="medium">邮件摘要</Text>
                  <Text size="sm" color="secondary" className="block">
                    每周发送一次工作摘要邮件
                  </Text>
                </div>
                <Switch checked={emailDigest} onChange={(v) => setEmailDigest(v)} />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('偏好设置')}>保存偏好</Button>
              </div>
            </div>
          </Card>
        </TabPane>

        {/* 登录设备 */}
        <TabPane tabKey="devices" label="登录设备">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Text weight="bold">当前登录设备</Text>
                  <Badge content={devices.length} variant="primary" standalone />
                </div>
              }>
              <List dataSource={devices} bordered="bordered" />
            </Card>

            <Card title="登录历史">
              <Timeline items={loginHistory} />
            </Card>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default ProfilePage;
