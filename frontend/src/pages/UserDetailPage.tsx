import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UserRound } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/providers/AuthProvider';
import { usersApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { UserStatusBadge } from '@/components/ui/StatusBadges';
import type { PublicUser } from '@/types';

export const UserDetailPage = () => {
  usePageTitle('Detalle de usuario');
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const userId = id;

  const query = useQuery({
    queryKey: ['users', 'detail', userId],
    queryFn: async () => unwrap(await usersApi.get(userId!)),
    enabled: Boolean(userId),
  });

  const user = query.data;

  const isAdmin = currentUser?.role === 'ADMIN';
  const isSelf = user?.id === currentUser?.id;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]">
            Detalle de usuario
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            Información de la cuenta de {user?.name ?? ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          {user && isAdmin && !isSelf ? (
            <Button
              onClick={() => navigate(`/users/${user.id}/editar`)}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Editar usuario
            </Button>
          ) : null}
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
        </div>
      ) : query.isError || !user ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400 mb-3">
              No se pudo cargar el usuario.
            </p>
            <Button variant="secondary" onClick={() => navigate('/users')}>
              Volver a usuarios
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6">
              <Avatar name={user.name} src={user.avatarUrl} size="lg" />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold text-ink">{user.name}</h2>
                  <Badge
                    tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={user.googleLinked ? 'success' : 'neutral'}>
                    {user.googleLinked ? 'Google vinculado' : 'Sin Google'}
                  </Badge>
                  <Badge tone={user.hasPassword ? 'neutral' : 'warning'}>
                    {user.hasPassword ? 'Contraseña activa' : 'Sin contraseña'}
                  </Badge>
                  {user.mustChangePassword ? (
                    <Badge tone="warning">Cambio de contraseña pendiente</Badge>
                  ) : null}
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                {isAdmin && !isSelf ? (
                  <Button
                    onClick={() => navigate(`/users/${user.id}/editar`)}
                    leftIcon={<ShieldCheck className="h-4 w-4" />}
                  >
                    Editar
                  </Button>
                ) : null}
                {isSelf ? (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/settings?tab=security')}
                  >
                    Gestionar mi cuenta
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-4">
                Actividad
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-elevated/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
                    Último acceso
                  </p>
                  <p className="text-sm text-ink">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-elevated/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
                    Cuenta creada
                  </p>
                  <p className="text-sm text-ink">
                    {formatDateTime(user.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => navigate('/users')}>
              Volver a usuarios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
