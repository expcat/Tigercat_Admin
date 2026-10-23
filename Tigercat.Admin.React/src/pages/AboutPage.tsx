import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { CopyButton } from '@expcat/tigercat-react/CopyButton';
import { usePermission } from '../utils/permission';
import type { InfoResponse } from '../utils/types';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Card } from '@expcat/tigercat-react/Card';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
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

const getInfoCards = (info: InfoResponse | null) => [
  {
    label: '服务名称',
    value: info?.name || 'Tigercat Admin API',
    icon: <PackageIcon size={20} />,
    iconClassName: 'bg-(--tiger-primary)/10 text-(--tiger-primary)',
  },
  {
    label: 'API 服务版本',
    value: info?.version || '—',
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
    title: '内容与媒体',
    description: '上传文件、查看媒体详情、标注与引用，并复制资源链接。',
    icon: <CompassIcon size={24} className="text-(--tiger-primary)" />,
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
  },
  {
    title: 'CSV 用户导入',
    description: 'UTF-8 CSV 字段映射、预览校验与逐行结果，刷新可恢复导入任务。',
    icon: <LockIcon size={24} className="text-(--tiger-primary)" />,
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
  },
  {
    title: '协作与审批',
    description: '我的工作台汇集任务、共享通知与团队日程，审批明确使用独立演示身份。',
    icon: <ZapIcon size={24} className="text-(--tiger-warning,#d97706)" />,
    className: 'from-(--tiger-bg-hover,#f8fafc) to-(--tiger-bg-card,#ffffff)',
  },
  {
    title: '报表与外观',
    description: '统计预览、导出与打印共用数据，支持窄屏及深浅色主题。',
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
  },
  {
    key: 'features',
    href: '#about-features',
    label: '特性',
  },
  {
    key: 'stack',
    href: '#about-stack',
    label: '技术栈',
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
    : !info
      ? { variant: 'danger' as const, label: '连接失败' }
      : { variant: 'success' as const, label: '已连接' };

  const infoRequest = useRef<AbortController | null>(null);
  const { has: hasPerm } = usePermission();
  const loadInfo = useCallback(async () => {
    infoRequest.current?.abort();
    const request = new AbortController();
    infoRequest.current = request;
    setLoading(true);
    setInfo(null);
    setErrorMessage('');
    try {
      const { data } = await apiRequest<InfoResponse>('/api/info', { signal: request.signal });
      if (request.signal.aborted) return;
      if (!data) throw new Error('服务信息为空，请重试。');
      setInfo(data);
    } catch (error: unknown) {
      if (!request.signal.aborted) setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInfo();
    return () => infoRequest.current?.abort();
  }, [loadInfo]);

  const handleAlertClose = () => {
    setErrorMessage('');
  };

  const techStack = [
    {
      label: '前端框架',
      value: 'React 19',
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
      value: 'Tigercat UI 3.0.0-rc.2',
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
        icon={<InfoIcon size={24} className="text-(--tiger-primary)" />}
        tags={[
          { label: '系统信息', variant: 'primary' },
          { label: connectionStatus.label, variant: connectionStatus.variant },
        ]}
      />

      <NavigationMenu aria-label="关于分区" className="min-w-0 overflow-x-auto">
        <NavigationMenuList>
          {ABOUT_SECTIONS.map((section) => (
            <NavigationMenuItem key={section.key} value={section.key}>
              <NavigationMenuLink
                href={section.href}
                onClick={(event) => scrollToAboutSection(event, section.href)}>
                {section.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Tag variant={connectionStatus.variant}>{connectionStatus.label}</Tag>
          <Button variant="outline" size="sm" loading={loading} disabled={loading} onClick={loadInfo}>重新连接服务</Button>
          {info && <CopyButton text={`服务：${info.name}\nAPI 服务版本：${info.version}\n描述：${info.description}\nTigercat UI：3.0.0-rc.2`} label="复制服务信息" />}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Text size="sm" color="secondary">
              正在加载服务信息...
            </Text>
          </div>
        ) : !info ? (
          <Text tag="p" size="sm" color="secondary">尚未获取服务信息，请重新连接服务。</Text>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getInfoCards(info).map((item) => (
              <div
                key={item.label}
                className="min-w-0 flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)">
                <div
                  className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${item.iconClassName}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 break-words">
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

      <Card header={<Text weight="bold">常用入口</Text>}>
        <div className="flex flex-wrap gap-4">
          <RouterLink className="p2-text-primary underline" to="/workspace">我的工作台</RouterLink>
          {hasPerm('media:view') && <RouterLink className="p2-text-primary underline" to="/files">文件管理与媒体详情</RouterLink>}
          {hasPerm('user:create') && <RouterLink className="p2-text-primary underline" to="/import">CSV 导入与结果</RouterLink>}
          <RouterLink className="p2-text-primary underline" to="/reports">报表预览与打印</RouterLink>
          <RouterLink className="p2-text-primary underline" to="/help">帮助中心</RouterLink>
        </div>
      </Card>

      <div id="about-stack">
      <Card header={<Text weight="bold">技术栈</Text>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {techStack.map((item) => (
            <div
              key={item.label}
              className="min-w-0 flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)">
              <div
                className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${item.iconClassName}`}>
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
              className="min-w-0 flex items-center gap-3 p-4 rounded-xl border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-hover,#f8fafc)">
              <div
                className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${item.iconClassName}`}>
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
