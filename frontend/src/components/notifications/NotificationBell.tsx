import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { notificationsApi, unwrap } from '@/lib/endpoints';
import type { Notification } from '@/types';

export const NotificationBell = () => {
  const { user } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const queryKey = ['notifications', user?.id];

  const query = useQuery({
    queryKey,
    queryFn: async () => unwrap(await notificationsApi.list()),
    enabled: Boolean(user),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const refreshNotifications = () =>
    queryClient.invalidateQueries({ queryKey });

  const markRead = useMutation({
    mutationFn: async (id: string) => unwrap(await notificationsApi.markRead(id)),
    onSuccess: refreshNotifications,
    onError: () => error('No se pudo actualizar la notificación.'),
  });

  const markAllRead = useMutation({
    mutationFn: async () => unwrap(await notificationsApi.markAllRead()),
    onSuccess: refreshNotifications,
    onError: () => error('No se pudieron marcar las notificaciones como leídas.'),
  });

  const openNotification = (notification: Notification) => {
    setOpen(false);
    if (notification.readAt) {
      navigate(`/team/task/${notification.taskId}`);
      return;
    }

    markRead.mutate(notification.id, {
      onSuccess: () => navigate(`/team/task/${notification.taskId}`),
    });
  };

  const notifications = query.data?.notifications ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={unreadCount ? `Notificaciones (${unreadCount})` : 'Notificaciones'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <section
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-float"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Notificaciones</h2>
              <p className="text-xs text-muted">
                {unreadCount === 1 ? '1 sin leer' : `${unreadCount} sin leer`}
              </p>
            </div>
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                leftIcon={
                  markAllRead.isPending ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )
                }
              >
                Leer todas
              </Button>
            ) : null}
          </header>

          <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
            {query.isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Cargando notificaciones…
              </p>
            ) : query.isError ? (
              <div className="space-y-2 px-4 py-6 text-center">
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  No se pudieron cargar las notificaciones.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void query.refetch()}
                  loading={query.isFetching}
                >
                  Reintentar
                </Button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No tienes notificaciones.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={
                      notification.readAt ? 'flex gap-2 px-3 py-3' : 'flex gap-2 bg-brand-soft/30 px-3 py-3'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-start gap-2">
                        {!notification.readAt ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">
                            {notification.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted">
                            {notification.message}
                          </span>
                          <span className="mt-1 block text-[10px] text-muted">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </span>
                      </span>
                    </button>
                    {!notification.readAt ? (
                      <button
                        type="button"
                        aria-label="Marcar como leída"
                        title="Marcar como leída"
                        onClick={() => markRead.mutate(notification.id)}
                        disabled={markRead.isPending}
                        className="mt-0.5 h-8 w-8 shrink-0 rounded-md text-muted hover:bg-elevated hover:text-ink disabled:opacity-50"
                      >
                        <Check className="mx-auto h-4 w-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
};
