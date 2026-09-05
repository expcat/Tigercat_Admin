import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
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
      className="min-w-0 overflow-hidden"
      title={
        <div className="flex min-w-0 items-center gap-3">
          <div className="p2-icon-chip flex h-12 w-12 shrink-0 items-center justify-center">
            {icon}
          </div>
          <div className="min-w-0">
            <Text size="lg" weight="bold" className="p2-text-primary block truncate">
              {title}
            </Text>
            <Text size="sm" color="secondary" className="block">
              {subtitle}
            </Text>
          </div>
        </div>
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
