import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    leadingIcon?: ReactNode;
    trailing?: ReactNode;
    invalid?: boolean;
  }
>(function Input({ className, leadingIcon, trailing, invalid, ...props }, ref) {
  return (
    <div className="relative">
      {leadingIcon ? (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
          {leadingIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          'input-base',
          leadingIcon && 'pl-10',
          trailing && 'pr-11',
          invalid && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {trailing ? (
        <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'input-base resize-y',
        invalid && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'input-base appearance-none pr-9',
          invalid && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: string }
>(function Checkbox({ className, label, hint, id, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer select-none items-start gap-2.5 text-sm text-ink',
        className,
      )}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-line text-brand accent-[rgb(var(--brand))] focus:ring-brand/40"
        {...props}
      />
      <span>
        {label}
        {hint ? <span className="mt-0.5 block text-xs font-normal text-muted">{hint}</span> : null}
      </span>
    </label>
  );
});

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export const Field = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FieldProps) => (
  <div className={className}>
    {label ? (
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
    ) : null}
    {children}
    {error ? (
      <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{error}</span>
      </p>
    ) : hint ? (
      <p className="hint">{hint}</p>
    ) : null}
  </div>
);
