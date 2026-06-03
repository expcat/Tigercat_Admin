import { Card, Tag, Text } from '@expcat/tigercat-react';
import type { ReactNode } from 'react';

export type PageHeaderTag = {
  label: string;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
};

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tags?: PageHeaderTag[];
}

export function PageHeader({ title, subtitle, icon, tags }: PageHeaderProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="p2-page-accent absolute inset-0 -m-4" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p2-icon-chip flex h-12 w-12 shrink-0 items-center justify-center">
                {icon}
              </div>
              <div className="min-w-0">
                <Text size="lg" weight="bold" className="p2-text-primary">
                  {title}
                </Text>
                <Text size="sm" color="secondary">
                  {subtitle}
                </Text>
              </div>
            </div>
          </div>
          {tags && tags.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {tags.map((tag) => (
                <Tag key={tag.label} color={tag.color} size="sm">
                  {tag.label}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
