import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

const variants = {
  info: {
    icon: Info,
    className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  },
  success: {
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  warning: {
    icon: TriangleAlert,
    className:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  },
  error: {
    icon: AlertCircle,
    className:
      'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  },
};

export const Alert = ({
  variant = 'info',
  title,
  children,
  onClose,
  className,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}) => {
  const { icon: Icon, className: tone } = variants[variant];
  return (
    <div
      className={cn('flex gap-3 rounded-xl border p-3.5 text-sm', tone, className)}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 h-4.5 w-4.5 h-[18px] w-[18px] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn('leading-5', title && 'mt-1')}>{children}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};
