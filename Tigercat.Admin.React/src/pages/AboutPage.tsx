import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Alert, Card, Text, Tag } from '@expcat/tigercat-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@expcat/tigercat-react/NavigationMenu';
import type { TagVariant } from '@expcat/tigercat-core';
import { apiRequest } from '../utils';
import {
  PackageIcon,
  TagIcon,
  MegaphoneIcon,
  CompassIcon,
  LockIcon,
  ZapIcon,
  PaletteIcon,
  InfoIcon,
  SettingsIcon,
  GlobeIcon,
  CodeIcon,
} from '../components/Icons';
import { PageHeader } from '../components/PageHeader';

interface InfoResponse {
  name: string;
  version: string;
  description: string;
}

const getInfoCards = (info: InfoResponse | null) => [
  {
    label: '服务名称',
    value: info?.name || 'Tigercat Admin API',
    icon: <PackageIcon size={20} />,
    iconClassName: 'bg-(--tiger-primary)/10 text-(--tiger-primary)',
  },
  {
    label: '当前版本',
    value: info?.version || 'v1.0.0',
    icon: <TagIcon size={20} />,
    iconClassName: 'bg-(--tiger-primary)/10 text-(--tiger-primary)',
  },
  {
    label: '服务描述',
    value: info?.description || 'Tigercat Admin Backend API',
    icon: <MegaphoneIcon size={20} />,
    iconClassName: 'bg-(--tiger-success,#16a34a)/10 text-(--tiger-success,#16a34a)',
  },
];

const highlights = [
  {
    title: '清晰导航体验',
    description: '统一的侧边栏布局，快速定位关键模块。',
    icon: <CompassIcon size={24} className="text-(--tiger-primary)" />,
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
  },
  {
    title: '安全认证体系',
    description: '基于令牌的认证机制，保障后台安全。',
    icon: <LockIcon size={24} className="text-(--tiger-primary)" />,
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
  },
  {
    title: '快速响应接口',
    description: '轻量化 API 提供稳定的管理体验。',
    icon: <ZapIcon size={24} className="text-(--tiger-warning,#d97706)" />,
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
  },
  {
    title: '一致视觉语言',
    description: '保持与首页一致的风格与组件呈现。',
    icon: <PaletteIcon size={24} className="text-(--tiger-success,#16a34a)" />,
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
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

const ABOUT_SECTIONS = [
  {
    key: 'info',
    href: '#about-info',
    label: '服务信息',
    description: '查看服务名称、版本与连接状态',
  },
  {
    key: 'features',
    href: '#about-features',
    label: '特性',
    description: '浏览产品亮点与体验说明',
  },
  {
    key: 'stack',
    href: '#about-stack',
    label: '技术栈',
    description: '了解前端、构建与 UI 组件',
  },
] as const;

function scrollToAboutSection(event: ReactMouseEvent, href: string) {
  event.preventDefault();
  const id = href.replace('#', '');
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function AboutPage() {
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const connectionStatus = loading
    ? { variant: 'primary' as const, label: '连接中' }
    : errorMessage
      ? { variant: 'danger' as const, label: '连接失败' }
      : { variant: 'success' as const, label: '已连接' };

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

  const techStack = [
    {
      label: '前端框架',
      value: 'React 18',
      icon: <PackageIcon size={20} />,
      iconClassName: 'bg-(--tiger-success,#16a34a)/10 text-(--tiger-success,#16a34a)',
    },
    {
      label: '构建工具',
      value: 'Vite',
      icon: <ZapIcon size={20} />,
      iconClassName: 'bg-(--tiger-warning,#d97706)/10 text-(--tiger-warning,#d97706)',
    },
    {
      label: '开发语言',
      value: 'TypeScript',
      icon: <CodeIcon size={20} />,
      iconClassName: 'bg-(--tiger-primary)/10 text-(--tiger-primary)',
    },
    {
      label: 'UI 组件',
      value: 'Tigercat UI',
      icon: <PaletteIcon size={20} />,
      iconClassName: 'bg-(--tiger-primary)/10 text-(--tiger-primary)',
    },
  ];

  const systemInfo = [
    {
      label: '运行环境',
      value: '.NET 10 + React',
      icon: <SettingsIcon size={20} />,
      iconClassName: 'bg-(--tiger-info,#3b82f6)/10 text-(--tiger-info,#3b82f6)',
    },
    {
      label: '包管理器',
      value: 'PNPM',
      icon: <PackageIcon size={20} />,
      iconClassName: 'bg-(--tiger-primary)/10 text-(--tiger-primary)',
    },
    {
      label: 'API 状态',
      value: connectionStatus.label,
      icon: <GlobeIcon size={20} />,
      iconClassName: 'bg-(--tiger-success,#16a34a)/10 text-(--tiger-success,#16a34a)',
      tagVariant: connectionStatus.variant,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="关于 Tigercat"
        subtitle="了解平台版本与服务信息"
        icon={<InfoIcon size={24} className="text-white" />}
        tags={[
          { label: '系统信息', variant: 'primary' },
          { label: connectionStatus.label, variant: connectionStatus.variant },
        ]}
      />

      <NavigationMenu className="min-w-0 overflow-x-auto">
        {ABOUT_SECTIONS.map((section) => (
          <NavigationMenuItem key={section.key} value={section.key}>
            <NavigationMenuTrigger>{section.label}</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink
                href={section.href}
                onClick={(event) => scrollToAboutSection(event, section.href)}>
                {section.description}
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenu>

      {errorMessage && (
        <Alert
          type="error"
          title="信息加载失败"
          description={errorMessage}
          closable
          onClose={handleAlertClose}
        />
      )}

      <div id="about-info">
      <Card header={<Text weight="bold">服务概览</Text>}>
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
                className="flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconClassName}`}>
                  {item.icon}
                </div>
                <div>
                  <Text size="xs" color="secondary">
                    {item.label}
                  </Text>
                  <Text size="sm" weight="medium">
                    {item.value}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>

      <div id="about-features">
      <Card header={<Text weight="bold">产品亮点</Text>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className={`flex items-start gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-linear-to-br ${item.className}`}>
              <div className="w-10 h-10 rounded-lg bg-(--tiger-surface,#ffffff) flex items-center justify-center text-xl">
                {item.icon}
              </div>
              <div>
                <Text size="sm" weight="medium">
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

      <div id="about-stack">
      <Card header={<Text weight="bold">技术栈</Text>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {techStack.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconClassName}`}>
                {item.icon}
              </div>
              <div>
                <Text size="xs" color="secondary">
                  {item.label}
                </Text>
                <Text size="sm" weight="medium">
                  {item.value}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>

      <Card header={<Text weight="bold">系统信息</Text>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {systemInfo.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconClassName}`}>
                {item.icon}
              </div>
              <div>
                <Text size="xs" color="secondary">
                  {item.label}
                </Text>
                {'tagVariant' in item ? (
                  <Tag
                    variant={item.tagVariant as TagVariant}
                    size="sm">
                    ● {item.value}
                  </Tag>
                ) : (
                  <Text size="sm" weight="medium">
                    {item.value}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default AboutPage;
