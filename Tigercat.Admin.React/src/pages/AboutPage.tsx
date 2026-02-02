import { useEffect, useState } from 'react';
import { Alert, Card, Text, Tag } from '@expcat/tigercat-react';
import { apiRequest } from '../utils';

interface InfoResponse {
  name: string;
  version: string;
  description: string;
}

const getInfoCards = (info: InfoResponse | null) => [
  {
    label: '服务名称',
    value: info?.name || 'Tigercat Admin API',
    icon: '📦',
    iconClassName: 'bg-blue-100 text-blue-600',
  },
  {
    label: '当前版本',
    value: info?.version || 'v1.0.0',
    icon: '🏷️',
    iconClassName: 'bg-purple-100 text-purple-600',
  },
  {
    label: '服务描述',
    value: info?.description || 'Tigercat Admin Backend API',
    icon: '📣',
    iconClassName: 'bg-green-100 text-green-600',
  },
];

const highlights = [
  {
    title: '清晰导航体验',
    description: '统一的侧边栏布局，快速定位关键模块。',
    icon: '🧭',
    className: 'from-blue-50 to-blue-100',
  },
  {
    title: '安全认证体系',
    description: '基于令牌的认证机制，保障后台安全。',
    icon: '🔒',
    className: 'from-purple-50 to-purple-100',
  },
  {
    title: '快速响应接口',
    description: '轻量化 API 提供稳定的管理体验。',
    icon: '⚡',
    className: 'from-orange-50 to-orange-100',
  },
  {
    title: '一致视觉语言',
    description: '保持与首页一致的风格与组件呈现。',
    icon: '🎨',
    className: 'from-green-50 to-green-100',
  },
];

const CONTAINS_CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/;

const getFriendlyErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    if (CONTAINS_CHINESE_CHAR_REGEX.test(error.message)) {
      return error.message;
    }
  }
  return '服务信息加载失败，请稍后重试。';
};

function AboutPage() {
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const connectionStatus = loading
    ? { color: 'blue' as const, label: '连接中' }
    : errorMessage
      ? { color: 'red' as const, label: '连接失败' }
      : { color: 'green' as const, label: '已连接' };

  useEffect(() => {
    const loadInfo = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const payload = await apiRequest<InfoResponse>('/api/info');
        setInfo(payload.data);
      } catch (error: unknown) {
        setErrorMessage(getFriendlyErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadInfo();
  }, []);

  const handleAlertClose = () => {
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl text-white">ℹ️</span>
                </div>
                <div>
                  <Text size="lg" weight="bold" className="text-slate-800">
                    关于 Tigercat
                  </Text>
                  <Text size="sm" color="secondary">
                    了解平台版本与服务信息
                  </Text>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Tag color="blue" size="sm">
                系统信息
              </Tag>
              <Tag color={connectionStatus.color} size="sm">
                {connectionStatus.label}
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      {errorMessage && (
        <Alert
          type="error"
          title="信息加载失败"
          description={errorMessage}
          closable
          onClose={handleAlertClose}
        />
      )}

      <Card title="服务概览">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Text size="sm" color="secondary">
              正在加载服务信息...
            </Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getInfoCards(info).map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconClassName}`}>
                  {item.icon}
                </div>
                <div>
                  <Text size="xs" color="secondary">
                    {item.label}
                  </Text>
                  <Text size="sm" weight="medium" className="text-slate-800">
                    {item.value}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="产品亮点">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className={`flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-gradient-to-br ${item.className}`}>
              <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center text-xl">
                {item.icon}
              </div>
              <div>
                <Text size="sm" weight="medium" className="text-slate-800">
                  {item.title}
                </Text>
                <Text size="xs" color="secondary" className="mt-1">
                  {item.description}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default AboutPage;
