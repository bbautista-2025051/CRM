import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usersApi } from '@/lib/endpoints';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/labels';
import { UserCreateModal } from '@/components/users/UserCreateModal';
import { UserEditModal } from '@/components/users/UserEditModal';
import { UserResetPasswordModal } from '@/components/users/UserResetPasswordModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { UserStatusBadge } from '@/components/ui/StatusBadges';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import type { PublicUser } from '@/types';

export const UsersPage = () => {
  usePageTitle('Usuarios');
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [resetting, setResetting] = useState<PublicUser | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  const query = useQuery({
    queryKey: ['users', 'list', { page, search: debouncedSearch, role, status }],
    queryFn: () =>
      usersApi.list({
        page,
        pageSize: 15,
        search: debouncedSearch || undefined,
        role: role || undefined,
        status: status || undefined,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
  });

  const users = query.data?.data ?? [];
  const meta = query.data?.meta;
  const hasFilters = Boolean(debouncedSearch || role || status);
  const clearFilters = () => {
    setSearch('');
    setRole('');
    setStatus('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        description="Gestiona el acceso del equipo, los roles y las contraseñas temporales."
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Nuevo usuario
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-strong dark:text-brand">
            <UsersRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-none text-ink">
              {meta ? formatNumber(meta.total) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-muted">Usuarios en el filtro actual</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-none text-ink">
              {formatNumber(users.filter((item) => item.role === 'ADMIN').length)}
            </p>
            <p className="mt-1 text-[11px] text-muted">Administradores en esta página</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-none text-ink">
              {formatNumber(users.filter((item) => item.mustChangePassword).length)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Con cambio de contraseña pendiente
            </p>
          </div>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre o correo…"
            className="sm:w-72"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              aria-label="Filtrar por rol"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-auto min-w-[150px]"
            >
              <option value="">Todos los roles</option>
              <option value="ADMIN">Administradores</option>
              <option value="VENDEDOR">Vendedores</option>
            </Select>
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-auto min-w-[140px]"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </Select>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
            <span className="ml-auto text-xs text-muted">
              {meta ? `${formatNumber(meta.total)} usuarios` : ''}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={hasFilters ? 'No encontramos usuarios' : 'Sin usuarios'}
            description={
              hasFilters
                ? 'Prueba con otros filtros o limpia la búsqueda.'
                : 'Crea la primera cuenta interna del equipo.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Nuevo usuario
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acceso</th>
                    <th>Último acceso</th>
                    <th>Creado</th>
                    <th className="w-12 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const isSelf = item.id === currentUser?.id;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={item.name} src={item.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                                {item.name}
                                {isSelf ? (
                                  <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                                    Tú
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-xs text-muted">{item.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge tone={item.role === 'ADMIN' ? 'brand' : 'neutral'}>
                            {ROLE_LABELS[item.role]}
                          </Badge>
                        </td>
                        <td>
                          <UserStatusBadge status={item.status} />
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge tone={item.googleLinked ? 'success' : 'outline'}>
                              {item.googleLinked ? 'Google' : 'Contraseña'}
                            </Badge>
                            {item.mustChangePassword ? (
                              <Badge tone="warning">Cambio pendiente</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-xs text-muted">
                          {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : 'Nunca'}
                        </td>
                        <td className="whitespace-nowrap text-xs text-muted">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="text-right">
                          <Dropdown
                            trigger={({ toggle }) => (
                              <button
                                type="button"
                                onClick={toggle}
                                className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                                aria-label={`Acciones para ${item.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            )}
                          >
                            {(close) => (
                              <>
                                <DropdownItem
                                  icon={<Pencil className="h-4 w-4" />}
                                  onClick={() => {
                                    close();
                                    setEditing(item);
                                  }}
                                >
                                  Editar
                                </DropdownItem>
                                {!isSelf ? (
                                  <>
                                    <DropdownSeparator />
                                    <DropdownItem
                                      icon={<KeyRound className="h-4 w-4" />}
                                      onClick={() => {
                                        close();
                                        setResetting(item);
                                      }}
                                    >
                                      Restablecer contraseña
                                    </DropdownItem>
                                  </>
                                ) : null}
                              </>
                            )}
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
          </>
        )}
      </Card>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-5 text-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        El sistema impide desactivar o degradar al último administrador activo. Restablecer
        una contraseña cierra todas las sesiones del usuario.
      </p>

      <UserCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserEditModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        user={editing}
        currentUserId={currentUser?.id}
      />
      <UserResetPasswordModal
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        user={resetting}
      />
    </div>
  );
};
