import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const tones = {
  brand: 'bg-brand-soft text-brand-strong dark:text-brand',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  slate: 'bg-elevated text-muted',
} as const;

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  loading = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  loading?: boolean;
  className?: string;
}) => (
  <div className={cn('card card-hover p-5', className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-muted">
          {label}
        </p>
        {loading ? (
          <div className="mt-2.5 h-8 w-28 animate-pulse rounded-md bg-elevated" />
        ) : (
          <p className="mt-2 truncate text-[26px] font-semibold leading-none tracking-tight text-ink">
            {value}
          </p>
        )}
        {hint ? <div className="mt-2.5 text-xs text-muted">{hint}</div> : null}
      </div>
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          tones[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </div>
);
