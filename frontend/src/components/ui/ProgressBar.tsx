import { cn } from '@/lib/cn';

const tones = {
  brand: 'bg-brand',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
} as const;

export const ProgressBar = ({
  value,
  tone = 'brand',
  className,
  label,
}: {
  value: number;
  tone?: keyof typeof tones;
  className?: string;
  label?: string;
}) => {
  const safe = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-elevated', className)}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progreso'}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
};
