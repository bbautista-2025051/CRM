import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center px-6 text-center',
      compact ? 'py-8' : 'py-14',
      className,
    )}
  >
    {Icon ? (
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-elevated text-muted">
        <Icon className="h-5 w-5" />
      </span>
    ) : null}
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    {description ? (
      <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-muted">{description}</p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
