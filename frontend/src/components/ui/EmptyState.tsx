import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { NexoIcon } from './NexoIcons';
import { cn } from '@/lib/cn';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon | NexoIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) => (
  <div
    className={cn(
      'flex flex-col gap-4 px-5 sm:flex-row sm:items-center sm:gap-5',
      compact ? 'py-6' : 'py-9',
      className,
    )}
  >
    {Icon ? (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-elevated text-muted">
        <Icon className="h-5 w-5" />
      </span>
    ) : null}
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-[13px] leading-5 text-muted">{description}</p>
      ) : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
