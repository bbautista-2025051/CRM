import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-ink shadow-sm hover:bg-brand-strong hover:-translate-y-px active:translate-y-0 active:bg-brand-strong disabled:hover:bg-brand disabled:hover:translate-y-0',
  secondary:
    'border border-line bg-surface text-ink shadow-sm hover:border-muted/40 hover:bg-elevated hover:-translate-y-px active:translate-y-0 active:bg-elevated',
  ghost: 'text-muted hover:bg-elevated hover:text-ink active:bg-elevated',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-700 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-600',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600',
  link: 'text-brand-strong underline-offset-4 hover:underline dark:text-brand',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-8 gap-1.5 rounded-md px-2.5 text-xs',
  sm: 'h-9 gap-1.5 rounded-[9px] px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-[10px] px-4 text-sm',
  lg: 'h-11 gap-2.5 rounded-[10px] px-5 text-sm',
  icon: 'h-9 w-9 rounded-[9px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const buttonStyles = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string =>
  cn(
    'focus-ring inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : leftIcon}
      {children}
      {!loading ? rightIcon : null}
    </button>
  );
});
