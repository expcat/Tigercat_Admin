import { Alert, Card, Text, Tag } from '@expcat/tigercat-react';
import { useOutletContext } from 'react-router-dom';
import {
  UsersIcon,
  LinkIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  ShieldIcon,
  SettingsIcon,
  FileTextIcon,
  LogoIcon,
} from '../components/Icons';

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

interface HomePageContext {
  notice: Notice;
  homeMessage: string;
  homeError: string;
  username?: string;
}

// 模拟统计数据
const stats = [
  {
    label: '总用户数',
    value: '1,234',
    trend: '+12%',
    trendUp: true,
    icon: <UsersIcon size={24} className="text-blue-500" />,
  },
  {
    label: '活跃会话',
    value: '56',
    trend: '+5',
    trendUp: true,
    icon: <LinkIcon size={24} className="text-indigo-500" />,
  },
  {
    label: '今日登录',
    value: '128',
    trend: '-3%',
    trendUp: false,
    icon: <TrendingUpIcon size={24} className="text-pink-500" />,
  },
  {
    label: '系统状态',
    value: '正常',
    status: 'success' as const,
    icon: <CheckCircleIcon size={24} className="text-green-500" />,
  },
];

// 快捷操作
const quickActions = [
  { label: '用户管理', icon: <UsersIcon size={20} />, key: 'users' },
  { label: '角色配置', icon: <ShieldIcon size={20} />, key: 'roles' },
  { label: '系统设置', icon: <SettingsIcon size={20} />, key: 'settings' },
  { label: '查看日志', icon: <FileTextIcon size={20} />, key: 'logs' },
];

// 最近活动
const recentActivities = [
  { time: '10 分钟前', action: '用户 admin 登录系统', type: 'info' as const },
  {
    time: '30 分钟前',
    action: '新用户 test_user 注册',
    type: 'success' as const,
  },
  { time: '1 小时前', action: '系统配置已更新', type: 'warning' as const },
  { time: '2 小时前', action: '用户 demo 修改密码', type: 'info' as const },
];

function HomePage() {
  const { notice, homeMessage, homeError, username } =
    useOutletContext<HomePageContext>();
  return (
    <div className="space-y-6">
      {/* 通知提示 */}
      {notice?.message && (
        <Alert
          type={notice.type || 'info'}
          title={notice.type === 'error' ? '操作失败' : '操作成功'}
          description={notice.message}
          closable
        />
      )}

      {/* 欢迎区域 */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center shrink-0">
                  <LogoIcon size={48} />
                </div>
                <div>
                  <Text size="lg" weight="bold" className="text-slate-800">
                    欢迎回来，{username || 'Admin'}！
                  </Text>
                  <Text size="sm" color="secondary">
                    {homeMessage || '今天是个好日子，让我们开始工作吧！'}
                  </Text>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Tag color="blue" size="sm">
                管理员
              </Tag>
              <Tag color="green" size="sm">
                已认证
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      {/* 加载错误提示 */}
      {homeError && (
        <Alert
          type="error"
          title="数据加载失败"
          description={homeError}
          closable
        />
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.label}
            className="group hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Text size="sm" color="secondary">
                  {stat.label}
                </Text>
                <div className="text-2xl font-bold mt-2 text-slate-800">
                  {stat.value}
                </div>
                {stat.trend && (
                  <div className="mt-2 flex items-center gap-1">
                    <Tag color={stat.trendUp ? 'green' : 'red'} size="sm">
                      {stat.trendUp ? '↑' : '↓'} {stat.trend}
                    </Tag>
                    <Text size="xs" color="secondary">
                      较昨日
                    </Text>
                  </div>
                )}
                {stat.status && (
                  <div className="mt-2">
                    <Tag color="green" size="sm">
                      ● 运行中
                    </Tag>
                  </div>
                )}
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                  index === 0
                    ? 'bg-blue-100'
                    : index === 1
                      ? 'bg-purple-100'
                      : index === 2
                        ? 'bg-orange-100'
                        : 'bg-green-100'
                }`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <Card title="快捷操作" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={action.key}
                className={`group flex flex-col items-center justify-center p-4 rounded-xl bg-linear-to-br transition-all duration-300 cursor-pointer border border-slate-200 hover:border-transparent hover:shadow-md ${
                  index === 0
                    ? 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200'
                    : index === 1
                      ? 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200'
                      : index === 2
                        ? 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200'
                        : 'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200'
                }`}>
                <span className="text-2xl mb-2 transition-transform group-hover:scale-110">
                  {action.icon}
                </span>
                <Text size="sm" weight="medium">
                  {action.label}
                </Text>
              </button>
            ))}
          </div>
        </Card>

        {/* 最近活动 */}
        <Card title="最近活动" className="lg:col-span-2">
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    activity.type === 'info'
                      ? 'bg-blue-500'
                      : activity.type === 'success'
                        ? 'bg-green-500'
                        : activity.type === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <Text size="sm" className="text-slate-700">
                    {activity.action}
                  </Text>
                  <Text size="xs" color="secondary" className="mt-1">
                    {activity.time}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 系统信息 */}
      <Card title="系统信息">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              📦
            </div>
            <div>
              <Text size="xs" color="secondary">
                系统版本
              </Text>
              <Text size="sm" weight="medium">
                v1.0.0
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              ⚡
            </div>
            <div>
              <Text size="xs" color="secondary">
                运行环境
              </Text>
              <Text size="sm" weight="medium">
                .NET 10 + React 19
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              📅
            </div>
            <div>
              <Text size="xs" color="secondary">
                最后更新
              </Text>
              <Text size="sm" weight="medium">
                2026-01-28
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              🌐
            </div>
            <div>
              <Text size="xs" color="secondary">
                API 状态
              </Text>
              <Tag color="green" size="sm">
                ● 在线
              </Tag>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default HomePage;
