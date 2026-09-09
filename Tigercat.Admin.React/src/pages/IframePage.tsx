import { Empty } from '@expcat/tigercat-react/Empty';
import { PageHeader } from '../components/PageHeader';
import { GlobeIcon } from '../components/Icons';
import { isSafeIframeSrc } from '../utils/schema-routes';

export default function IframePage({
  src,
  title,
}: {
  src?: string;
  title?: string;
}) {
  const iframeSrc = isSafeIframeSrc(src) ? src : undefined;
  const heading = title || '嵌入页面';

  return (
    <div className="space-y-4">
      <PageHeader
        title={heading}
        subtitle="该页面由菜单 schema 的 iframeSrc 嵌入，没有独立业务页。"
        icon={<GlobeIcon size={24} />}
      />
      {iframeSrc ? (
        <div className="overflow-hidden rounded-[var(--tiger-radius-lg,12px)] border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#fff)">
          <iframe
            src={iframeSrc}
            title={heading}
            className="block h-[min(70vh,720px)] w-full border-0"
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <Empty description="未提供可嵌入的地址" />
      )}
    </div>
  );
}
