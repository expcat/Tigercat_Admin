import type { ReactNode } from 'react';
import {
  Badge,
  Card,
  Empty,
  Loading,
  Statistic,
  Text,
} from '@expcat/tigercat-react';

interface MetricCardProps {
  title: string;
  value?: string | number;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: string | number;
  loading?: boolean;
  framed?: boolean;
}

interface MetricGridProps {
  children: ReactNode;
  columns?: 3 | 4;
}

interface PageActionPanelProps {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}

interface MutedPanelProps {
  title?: string;
  description: ReactNode;
  compact?: boolean;
  className?: string;
}

interface ChartEmptyStateProps {
  description: string;
  heightClassName?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  badge,
  loading = false,
  framed = true,
}: MetricCardProps) {
  const iconNode = badge === undefined ? (
    icon
  ) : (
    <Badge content={badge} type="number" showZero standalone={false}>
      {icon}
    </Badge>
  );

  const content = (
    <div className="flex items-center gap-3">
      {iconNode ? (
        <div className="p2-icon-chip flex h-11 w-11 shrink-0 items-center justify-center transition-transform group-hover:scale-110">
          {iconNode}
        </div>
      ) : null}
      <div className="min-w-0">
        {loading ? (
          <>
            <Text size="sm" color="secondary">
              {title}
            </Text>
            <div className="mt-2">
              <Loading size="sm" />
            </div>
          </>
        ) : value !== undefined ? (
          <Statistic title={title} value={value} />
        ) : (
          <Text weight="bold">{title}</Text>
        )}
        {description ? (
          <Text size="sm" color="secondary">
            {description}
          </Text>
        ) : null}
      </div>
    </div>
  );

  if (!framed) {
    return <div className="group">{content}</div>;
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300">
      {content}
    </Card>
  );
}

export function MetricGrid({ children, columns = 3 }: MetricGridProps) {
  const columnClass =
    columns === 4 ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 gap-4 ${columnClass}`}>{children}</div>
  );
}

export function PageActionPanel({
  title,
  description,
  actions,
}: PageActionPanelProps) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Text weight="bold">{title}</Text>
          <Text size="sm" color="secondary">
            {description}
          </Text>
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function MutedPanel({
  title,
  description,
  compact = false,
  className = '',
}: MutedPanelProps) {
  return (
    <div
      className={`p2-muted-panel flex flex-col gap-2 ${compact ? 'px-4 py-3' : 'p-4'} ${className}`}>
      {title ? <Text weight="bold">{title}</Text> : null}
      <Text size="sm" color="secondary">
        {description}
      </Text>
    </div>
  );
}

export function ChartEmptyState({
  description,
  heightClassName = 'h-52',
}: ChartEmptyStateProps) {
  return (
    <div className={`flex items-center justify-center ${heightClassName}`}>
      <Empty description={description} showImage={false} />
    </div>
  );
}
