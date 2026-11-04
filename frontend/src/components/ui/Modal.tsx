import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  /** Ventana completa: ocupa todo el viewport, sin marco flotante. */
  fullWindow?: boolean;
  className?: string;
}

const focusable =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  fullWindow = false,
  className,
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(focusable);
      (first ?? panelRef.current)?.focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const elements = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(focusable),
    ).filter((element) => element.offsetParent !== null);
    if (elements.length === 0) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed z-[90] overflow-y-auto bg-slate-950/60',
        fullWindow
          ? 'inset-y-0 right-0 left-0 flex flex-col lg:left-[var(--nexo-sidebar,0px)]'
          : 'inset-0 flex items-start justify-center p-4 sm:items-center',
      )}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={cn(
          fullWindow
            ? 'flex h-screen w-full max-w-none flex-col border-0 bg-surface outline-none'
            : 'my-auto w-full animate-slide-up rounded-2xl border border-line bg-surface shadow-float outline-none',
          !fullWindow && sizes[size],
          className,
        )}
      >
        <div
          className={cn(
            'flex items-start gap-4 border-b border-line bg-surface px-5 py-4 sm:px-6',
            fullWindow && 'shrink-0 px-6',
          )}
        >
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className={cn(
                'text-base font-semibold text-ink',
                fullWindow && 'font-display text-[16px] font-bold tracking-[-0.01em]',
              )}
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-[13px] leading-5 text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring -mr-1 rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            'px-5 py-5 sm:px-6',
            fullWindow
              ? 'min-h-0 flex-1 overflow-y-auto px-6'
              : 'max-h-[calc(100vh-16rem)] overflow-y-auto',
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              'flex flex-col-reverse gap-2 border-t border-line bg-elevated/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6',
              fullWindow && 'mt-auto shrink-0 px-6',
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
