import { Tag } from '@expcat/tigercat-react/Tag';
import { PageHeader as TigerPageHeader } from '@expcat/tigercat-react/PageHeader';
import type { TagVariant } from '@expcat/tigercat-core';
import type { ReactNode } from 'react';

export type PageHeaderTag = {
  label: string;
  variant: TagVariant;
};

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tags?: PageHeaderTag[];
}

export function PageHeader({ title, subtitle, icon, tags }: PageHeaderProps) {
  return (
    <TigerPageHeader
      showBack={false}
      className="min-w-0 overflow-hidden [&_.tiger-page-header-title-row]:flex-col [&_.tiger-page-header-title-row]:items-start"
      subTitle={subtitle}
      title={
        <span className="flex min-w-0 items-center gap-3">
          <span className="p2-icon-chip flex h-10 w-10 shrink-0 items-center justify-center [&_svg]:text-current">
            {icon}
          </span>
          <span className="min-w-0 text-xl font-semibold tracking-tight sm:text-2xl">{title}</span>
        </span>
      }
      actions={
        tags && tags.length > 0 ? (
          <div className="hidden sm:flex items-center gap-2">
            {tags.map((tag) => (
              <Tag key={tag.label} variant={tag.variant} size="sm">
                {tag.label}
              </Tag>
            ))}
          </div>
        ) : undefined
      }
    />
  );
}
