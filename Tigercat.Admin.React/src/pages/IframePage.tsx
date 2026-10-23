import { useEffect, useState } from 'react';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Empty } from '@expcat/tigercat-react/Empty';
import { PageHeader } from '../components/PageHeader';
import { GlobeIcon } from '../components/Icons';
import { isSafeIframeSrc } from '../utils/schema-routes';

export default function IframePage({ src, title }: { src?: string; title?: string }) {
  const iframeSrc = isSafeIframeSrc(src) ? src.trim() : undefined;
  const heading = title || '嵌入页面';
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'slow' | 'error'>('loading');

  useEffect(() => {
    setLoadState('loading');
    if (!iframeSrc) return;
    const timer = window.setTimeout(() => setLoadState((state) => state === 'loading' ? 'slow' : state), 15_000);
    return () => window.clearTimeout(timer);
  }, [iframeSrc, reloadKey]);

  return (
    <div className="space-y-4">
      <PageHeader title={heading} subtitle="查看嵌入内容；页面空白或无法加载时，可重新加载或在新窗口打开。" icon={<GlobeIcon size={24} />} />
      {iframeSrc ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>重新加载</Button>
            <a href={iframeSrc} target="_blank" rel="noopener noreferrer" className="text-sm text-(--tiger-primary) hover:underline">在新窗口打开</a>
            <span role="status" className="p2-text-secondary text-sm">{loadState === 'loading' ? '正在加载嵌入内容…' : loadState === 'loaded' ? '嵌入页面已响应' : ''}</span>
          </div>
          {(loadState === 'slow' || loadState === 'error') && (
            <Alert type="warning" title={loadState === 'slow' ? '加载等待较久，可重试或在新窗口打开' : '嵌入内容加载失败，请重试'} showIcon />
          )}
          <div aria-busy={loadState === 'loading'} className="overflow-hidden rounded-[var(--tiger-radius-lg,12px)] border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#fff)">
            <iframe
              key={`${iframeSrc}:${reloadKey}`}
              src={iframeSrc}
              title={heading}
              onLoad={() => setLoadState('loaded')}
              onError={() => setLoadState('error')}
              className="block h-[min(70vh,720px)] w-full border-0"
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
            />
          </div>
        </>
      ) : <Empty description="未提供可嵌入的地址" />}
    </div>
  );
}
