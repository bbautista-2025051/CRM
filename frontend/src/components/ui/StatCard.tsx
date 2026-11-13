import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NexoIcon } from './NexoIcons';
import { cn } from '@/lib/cn';

const tones = {
  brand: 'text-brand',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  sky: 'text-sky-600 dark:text-sky-400',
  slate: 'text-muted',
} as const;

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  loading = false,
  flat = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon | NexoIcon;
  tone?: keyof typeof tones;
  loading?: boolean;
  /** Sin caja: la m├®trica vive dentro de una tira dividida. */
  flat?: boolean;
  className?: string;
}) => (
  <div className={cn(!flat && 'card', 'px-5 py-4 sm:py-5', className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </p>
        {loading ? (
          <div className="mt-3 h-8 w-28 animate-pulse rounded-md bg-elevated" />
        ) : (
          <p className="metric mt-2 truncate text-[28px] font-bold leading-none text-ink">
            {value}
          </p>
        )}
        {hint ? <div className="mt-2.5 text-xs text-muted">{hint}</div> : null}
      </div>
      <Icon className={cn('h-4 w-4 shrink-0', tones[tone])} aria-hidden />
    </div>
  </div>
);
