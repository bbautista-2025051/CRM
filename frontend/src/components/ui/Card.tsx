import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('card', className)} {...props} />
);

export const CardHeader = ({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
      className,
    )}
  >
    <div className="min-w-0">
      <h2 className="font-display text-[15px] font-bold tracking-[-0.015em] text-ink">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const CardBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...props} />
);
