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
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white">
                {icon}
              </div>
              <div>
                <Text size="lg" weight="bold" className="text-slate-800">
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
