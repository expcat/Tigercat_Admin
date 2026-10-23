import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Avatar } from '@expcat/tigercat-react/Avatar';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Message } from '@expcat/tigercat-react/Message';
import { Switch } from '@expcat/tigercat-react/Switch';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Tabs } from '@expcat/tigercat-react/Tabs';
import { TabPane } from '@expcat/tigercat-react/TabPane';
import { Descriptions } from '@expcat/tigercat-react/Descriptions';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Rate } from '@expcat/tigercat-react/Rate';
import { Alert } from '@expcat/tigercat-react/Alert';
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
import { InputOTP } from '@expcat/tigercat-react/InputOTP';
import { MaskInput } from '@expcat/tigercat-react/MaskInput';
import { Row } from '@expcat/tigercat-react/Row';
import { Col } from '@expcat/tigercat-react/Col';
import { Icon } from '@expcat/tigercat-react/Icon';
import type {
  DescriptionsItem,
  TimelineItem,
  ListItem,
  TimePickerRangeTuple,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';

import {
  DEMO_OTP_CODE,
  OTP_LENGTH,
  PHONE_MASK,
  fetchTwoFactorStatus,
  updateTwoFactorEnabled,
} from '../utils';

const swatchColors = ['#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f97316', '#14b8a6'];
const fontMarks: Record<number, string> = { 12: '小', 16: '中', 20: '大' };

const devices: ListItem[] = [
  { key: 'd1', title: 'MacBook Pro · Chrome', description: '上海 · 示例设备 · 192.168.1.20' },
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

  const basicItems: DescriptionsItem[] = [
    { label: '用户名', content: username },
    { label: '资料来源', content: '当前登录会话' },
    { label: '更多资料', content: '尚未接入个人资料接口' },
  ];

  // 安全设置
  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlert: true,
    remoteProtect: false,
  });
  const [phone, setPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  const [twoFactorReady, setTwoFactorReady] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [bindError, setBindError] = useState('');
  const twoFactorRequest = useRef<AbortController | null>(null);
  const bindRef = useRef<HTMLInputElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const focusTwoFactor = () => requestAnimationFrame(() => {
    securityRef.current?.querySelector<HTMLButtonElement>('[role="switch"][aria-label="两步验证"]')?.focus();
  });

  const loadTwoFactor = async () => {
    if (twoFactorRequest.current && !twoFactorRequest.current.signal.aborted) return;
    const request = new AbortController();
    twoFactorRequest.current = request;
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const payload = await fetchTwoFactorStatus(request.signal);
      if (request.signal.aborted) return;
      if (typeof payload?.data?.enabled !== 'boolean') throw new Error('两步验证状态响应不完整，请重试');
      setSecurity((s) => ({ ...s, twoFactor: payload.data.enabled }));
      setTwoFactorReady(true);
    } catch (error: unknown) {
      if (!request.signal.aborted) {
        setTwoFactorReady(false);
        setTwoFactorError(error instanceof Error ? error.message : '两步验证状态加载失败');
      }
    } finally {
      if (twoFactorRequest.current === request && !request.signal.aborted) {
        twoFactorRequest.current = null;
        setTwoFactorLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadTwoFactor();
    return () => twoFactorRequest.current?.abort();
  }, []);

  const cancelTwoFactorBind = () => {
    setTwoFactorPending(false);
    setBindCode('');
    setBindError('');
    focusTwoFactor();
  };

  const saveTwoFactor = async (enabled: boolean) => {
    if (!twoFactorReady || twoFactorRequest.current) return;
    const request = new AbortController();
    twoFactorRequest.current = request;
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const payload = await updateTwoFactorEnabled(enabled, request.signal);
      if (request.signal.aborted) return;
      if (typeof payload?.data?.enabled !== 'boolean') throw new Error('两步验证状态响应不完整，请重新读取');
      setSecurity((s) => ({ ...s, twoFactor: payload.data.enabled }));
      cancelTwoFactorBind();
      Message.success({ content: payload.data.enabled ? '两步验证已开启' : '两步验证已关闭', duration: 2000 });
    } catch (error: unknown) {
      if (!request.signal.aborted) setTwoFactorError(error instanceof Error ? error.message : '两步验证保存失败，请重试');
    } finally {
      if (twoFactorRequest.current === request && !request.signal.aborted) {
        twoFactorRequest.current = null;
        setTwoFactorLoading(false);
      }
    }
  };

  const handleTwoFactorChange = (enabled: boolean) => {
    if (!twoFactorReady || twoFactorLoading) return;
    if (enabled) {
      setTwoFactorPending(true);
      setBindCode('');
      setBindError('');
    } else if (twoFactorPending) cancelTwoFactorBind();
    else void saveTwoFactor(false);
  };

  const confirmTwoFactorBind = () => {
    if (bindCode !== DEMO_OTP_CODE) {
      setBindError('验证码错误，请输入演示验证码 123456');
      bindRef.current?.focus();
      return;
    }
    void saveTwoFactor(true);
  };

  // 偏好
  const [density, setDensity] = useState<string | number>('comfortable');
  const [themeColor, setThemeColor] = useState('#3b82f6');
  const [fontSize, setFontSize] = useState(14);
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [quietHours, setQuietHours] = useState<TimePickerRangeTuple | null>(['22:00', '07:00']);
  const [bio, setBio] = useState('');
  const [emailDigest, setEmailDigest] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Icon name="user" size="lg" />}
        title="个人中心"
        subtitle="管理你的资料、安全选项、偏好与登录设备"
        tags={[
          { label: '已认证', variant: 'success' },
        ]}
      />

      <Tabs defaultActiveKey="basic">
        {/* 基本资料 */}
        <TabPane tabKey="basic" label="基本资料">
          <div className="space-y-6">
            <MutedPanel description="用户名来自当前会话；活跃度、登录次数、积分与在线天数为组件示例，不代表当前账号统计。" />
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Badge type="dot" variant="success" standalone={false}>
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
                        已登录账号
                      </Tag>
                      <Text size="sm" color="secondary">
                        当前会话
                      </Text>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Text size="sm" color="secondary">
                    示例活跃度
                  </Text>
                  <Rate value={4} disabled allowHalf />
                </div>
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              <Col span={{ xs: 24, sm: 8 }}>
                <Card>
                  <Statistic title="示例登录次数" value={1280} groupSeparator />
                </Card>
              </Col>
              <Col span={{ xs: 24, sm: 8 }}>
                <Card>
                  <Statistic title="示例积分" value={4860} suffix="分" />
                </Card>
              </Col>
              <Col span={{ xs: 24, sm: 8 }}>
                <Card>
                  <Statistic title="示例连续在线" value={36} suffix="天" />
                </Card>
              </Col>
            </Row>

            <Card title="资料详情">
              <Descriptions items={basicItems} column={{ xs: 1, sm: 2, lg: 3 }} bordered colon />
            </Card>
          </div>
        </TabPane>

        {/* 安全设置 */}
        <TabPane tabKey="security" label="安全设置">
          <div className="space-y-6" ref={securityRef}>
            {twoFactorError && <Alert type="error" title={twoFactorError} showIcon action={<Button size="sm" variant="outline" loading={twoFactorLoading} onClick={loadTwoFactor}>重新读取状态</Button>} />}
            <Card title="安全选项">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <Text weight="medium">两步验证</Text>
                    <Text size="sm" color="secondary" className="block">
                      {twoFactorLoading ? '正在读取或保存两步验证状态…' : !twoFactorReady ? '状态尚未读取，请重试' : twoFactorPending ? '待确认启用，尚未保存' : '使用固定演示验证码，开关写入当前账号'}
                    </Text>
                  </div>
                  <Switch
                    checked={security.twoFactor || twoFactorPending}
                    aria-label="两步验证"
                    disabled={!twoFactorReady || twoFactorLoading}
                    onChange={handleTwoFactorChange}
                  />
                </div>
                <Divider spacing="sm" />
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <Text weight="medium">登录提醒</Text>
                    <Text size="sm" color="secondary" className="block">
                      演示开关，尚未接入邮件通知
                    </Text>
                  </div>
                  <Switch
                    checked={security.loginAlert}
                    aria-label="登录提醒"
                    onChange={(v) => setSecurity((s) => ({ ...s, loginAlert: v }))}
                  />
                </div>
                <Divider spacing="sm" />
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <Text weight="medium">异地登录保护</Text>
                    <Text size="sm" color="secondary" className="block">
                      演示开关，不执行异地登录拦截
                    </Text>
                  </div>
                  <Switch
                    checked={security.remoteProtect}
                    aria-label="异地登录保护"
                    onChange={(v) => setSecurity((s) => ({ ...s, remoteProtect: v }))}
                  />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {twoFactorPending && <Card title="确认启用两步验证">
                <div className="flex flex-col items-center gap-3">
                  <MutedPanel description="演示验证码固定 123456；确认会写入当前账号，两步验证在下次登录时生效。" />
                  <div data-testid="profile-2fa-otp">
                    <InputOTP
                      ref={bindRef}
                      autoFocus
                      disabled={twoFactorLoading}
                      status={bindError ? 'error' : undefined}
                      errorMessage={bindError}
                      value={bindCode}
                      length={OTP_LENGTH}
                      type="numeric"
                      ariaLabel="两步验证绑定码"
                      onChange={(value) => { setBindCode(value); setBindError(''); }}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); confirmTwoFactorBind(); } }}
                    />
                  </div>
                  <Button
                    loading={twoFactorLoading}
                    disabled={bindCode.length !== OTP_LENGTH}
                    onClick={confirmTwoFactorBind}
                  >
                    确认启用
                  </Button>
                  <Button variant="outline" disabled={twoFactorLoading} onClick={cancelTwoFactorBind}>取消启用</Button>
                </div>
              </Card>}
              <Card title="手机号（演示）">
                <MaskInput value={phone} mask={PHONE_MASK} placeholder="请输入手机号" onChange={setPhone} />
                <Text size="sm" color="secondary" className="mt-2 block">
                  仅用于演示掩码输入，本期不持久化。
                </Text>
              </Card>

              <Card title="电子签名（演示）">
                <Signature height={160} clearable clearText="清除" />
                <Text size="sm" color="secondary" className="mt-2 block">签名仅在当前页预览，尚未接入保存接口。</Text>
              </Card>
            </div>
          </div>
        </TabPane>

        {/* 偏好 */}
        <TabPane tabKey="preference" label="偏好">
          <Card title="界面与通知偏好（演示）">
            <MutedPanel className="mb-6" description="以下控件仅在当前个人中心页面预览，离开后重置；不修改全站主题，也不发送邮件。全站外观请使用右上角主题配置。" />
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
                  onChange={setBio}
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
                    演示开关，尚未接入邮件发送
                  </Text>
                </div>
                <Switch aria-label="邮件摘要" checked={emailDigest} onChange={(v) => setEmailDigest(v)} />
              </div>

            </div>
          </Card>
        </TabPane>

        {/* 登录设备 */}
        <TabPane tabKey="devices" label="登录设备">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MutedPanel className="lg:col-span-2" description="以下设备与历史为静态示例；尚未接入设备查询或下线接口，不代表真实登录状态。" />
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Text weight="bold">当前登录设备（示例）</Text>
                  <Badge content={devices.length} variant="primary" standalone />
                </div>
              }>
              <List dataSource={devices} bordered />
            </Card>

            <Card title="登录历史（示例）">
              <Timeline items={loginHistory} />
            </Card>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default ProfilePage;
