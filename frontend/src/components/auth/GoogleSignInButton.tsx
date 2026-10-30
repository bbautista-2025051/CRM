import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

let scriptPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-gsi="true"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('GIS load error')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client?hl=es';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS load error'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export const GoogleSignInButton = ({
  clientId,
  onCredential,
  mode = 'login',
  disabled = false,
  className,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  mode?: 'login' | 'link';
  disabled?: boolean;
  className?: string;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  const render = useCallback(() => {
    const element = container.current;
    if (!element || !window.google?.accounts?.id) return;
    element.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) onCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      context: mode === 'login' ? 'signin' : 'use',
    });
    const width = Math.min(Math.max(Math.round(element.clientWidth || 320), 220), 380);
    window.google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: mode === 'login' ? 'continue_with' : 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width,
    });
    setStatus('ready');
  }, [clientId, mode, onCredential]);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    loadGoogleScript()
      .then(() => {
        if (!active) return;
        requestAnimationFrame(render);
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [render, attempt]);

  useEffect(() => {
    if (status !== 'ready') return;
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(render, 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [status, render]);

  if (status === 'error') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border border-line bg-elevated px-3 py-2.5 text-xs text-muted',
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No se pudo cargar Google
        </span>
        <button
          type="button"
          onClick={() => {
            scriptPromise = null;
            setAttempt((value) => value + 1);
          }}
          className="inline-flex items-center gap-1 font-medium text-brand-strong hover:underline dark:text-brand"
        >
          <RefreshCw className="h-3 w-3" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative min-h-[40px]', className)} aria-busy={status === 'loading'}>
      {status === 'loading' ? (
        <div className="h-10 w-full animate-pulse rounded-lg border border-line bg-elevated" />
      ) : null}
      <div
        ref={container}
        className={cn(
          'flex min-h-[40px] w-full justify-center [color-scheme:light]',
          disabled && 'pointer-events-none opacity-50',
        )}
      />
    </div>
  );
};
