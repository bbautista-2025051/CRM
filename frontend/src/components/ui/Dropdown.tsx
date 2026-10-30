import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

export const Dropdown = ({
  trigger,
  children,
  align = 'right',
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((current) => !current) })}
      {open ? (
        <div
          className={cn(
            'absolute top-full z-50 mt-1.5 min-w-[190px] animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-float',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
};

export const DropdownItem = ({
  children,
  icon,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
      danger
        ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
        : 'text-ink hover:bg-elevated',
    )}
  >
    {icon ? <span className="text-muted">{icon}</span> : null}
    {children}
  </button>
);

export const DropdownSeparator = () => <div className="my-1 h-px bg-line" />;
