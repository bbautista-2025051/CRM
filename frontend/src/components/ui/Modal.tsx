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
import { useOptionalSidebar } from '@/components/ui/app-1-utils/sidebar';

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
  inline?: boolean;
  className?: string;
}

const focusable =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Pila de modales abiertos. Cada modal vive en su propio portal con el mismo
 * z-index, as├¡ que cuando hay varios superpuestos (p. ej. crear una empresa
 * desde el formulario de una oportunidad) solo el ├║ltimo abierto ÔÇöel de
 * encimaÔÇö debe reaccionar a Escape, para no cerrar tambi├®n al que est├í detr├ís.
 */
const modalStack: number[] = [];
let modalSeq = 0;

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  fullWindow = true,
  inline = false,
  className,
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Ref para usar el onClose vigente sin re-ejecutar el efecto de apertura
  // cuando el padre pasa una funci├│n nueva en cada render (p. ej. al teclear).
  const onCloseRef = useRef(onClose);
  const sidebar = useOptionalSidebar();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const titleId = useId();
  const descriptionId = useId();
  const layoutStyle = sidebar
    ? {
        top: '4rem',
        left: sidebar.isMobile ? '0' : sidebar.open ? '16rem' : '4rem',
      }
    : undefined;

  useEffect(() => {
    if (!open || inline) return;
    const id = modalSeq++;
    modalStack.push(id);

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      // Se enfoca el panel (tabIndex -1) para no resaltar el bot├│n de cerrar
      // al abrir; el ciclo con Tab lo maneja el focus-trap del panel.
      panelRef.current?.focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (modalStack[modalStack.length - 1] !== id) return;
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      const index = modalStack.indexOf(id);
      if (index !== -1) modalStack.splice(index, 1);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus?.();
    };
    // Solo reacciona a `open`: los cambios de identidad de onClose no deben
    // reenfocar el modal mientras el usuario escribe dentro de ├®l.
  }, [open, inline]);

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

  if (inline) {
    return (
      <section
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn('space-y-5', className)}
      >
        <header>
          <h1
            id={titleId}
            className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]"
          >
            {title}
          </h1>
          {description ? (
            <p
              id={descriptionId}
              className="mt-1.5 max-w-2xl text-[13px] leading-6 text-muted"
            >
              {description}
            </p>
          ) : null}
        </header>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-6">
          {children}
        </div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </section>
    );
  }

  return createPortal(
    <div
      className={cn(
        'fixed z-[90] overflow-y-auto bg-slate-950/60',
        fullWindow
          ? 'inset-0 flex flex-col'
          : 'inset-0 flex items-start justify-center p-4 sm:items-center',
      )}
      style={layoutStyle}
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
            ? 'flex h-full w-full max-w-none flex-col border-0 bg-surface outline-none'
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
              ? 'mx-auto w-full max-w-6xl min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8'
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
