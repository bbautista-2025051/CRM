import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCompanyOptions } from '@/hooks/queries';
import { clientsApi } from '@/lib/endpoints';
import { canArchive } from '@/lib/permissions';
import { formatNumber } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClientStatusBadge } from '@/components/ui/StatusBadges';
import { Avatar } from '@/components/ui/Avatar';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import type { Client } from '@/types';

export const ClientsPage = () => {
  usePageTitle('Clientes');
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const companies = useCompanyOptions('', true);

  const companyFromUrl = searchParams.get('companyId') ?? '';
  const createRequested = searchParams.get('create') === '1';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState(companyFromUrl);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState<string | undefined>();
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, companyId]);

  useEffect(() => {
    if (!createRequested) return;
    setEditing(null);
    setDefaultCompanyId(companyFromUrl || undefined);
    setFormOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    next.delete('companyId');
    setSearchParams(next, { replace: true });
    // Solo debe ejecutarse cuando la URL solicita crear un cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequested]);

  const query = useQuery({
    queryKey: ['clients', 'list', { page, search: debouncedSearch, status, companyId }],
    queryFn: () =>
      clientsApi.list({
        page,
        pageSize: 15,
        search: debouncedSearch || undefined,
        status: status || undefined,
        companyId: companyId || undefined,
        sortBy: 'lastName',
        sortOrder: 'asc',
      }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => clientsApi.archive(id),
    onSuccess: (response) => {
      success('Cliente archivado', response.message);
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo archivar',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDefaultCompanyId(companyId || undefined);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setDefaultCompanyId(undefined);
    setFormOpen(true);
  };

  const onArchive = async (client: Client) => {
    const accepted = await confirm({
      title: `Archivar a ${client.firstName} ${client.lastName}`,
      description:
        'El cliente y su hist├│rico comercial se conservar├ín. No podr├ís asociarle nuevas oportunidades o ventas mientras est├® archivado.',
      confirmLabel: 'Archivar cliente',
      variant: 'danger',
    });
    if (accepted) archive.mutate(client.id);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCompanyId('');
  };

  const clients = query.data?.data ?? [];
  const meta = query.data?.meta;
  const hasFilters = Boolean(debouncedSearch || status || companyId);
  const selectedCompany = companies.data?.find((company) => company.id === companyId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Gestiona tus contactos y su relaci├│n con cada empresa."
        actions={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Nuevo cliente
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, correo o tel├®fonoÔÇª"
            className="sm:w-80"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-auto min-w-[140px]"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="ARCHIVED">Archivados</option>
            </Select>
            <Select
              aria-label="Filtrar por empresa"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="w-auto min-w-[180px]"
            >
              <option value="">Todas las empresas</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
            <span className="ml-auto text-xs text-muted">
              {meta ? `${formatNumber(meta.total)} clientes` : ''}
              {selectedCompany ? ` ┬À ${selectedCompany.name}` : ''}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={hasFilters ? 'No encontramos clientes' : 'A├║n no hay clientes'}
            description={
              hasFilters
                ? 'Prueba con otros filtros o limpia la b├║squeda.'
                : 'Registra tu primer contacto para empezar a construir tu cartera.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
                  Nuevo cliente
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
                    <th>Cliente</th>
                    <th>Empresa</th>
                    <th>Contacto</th>
                    <th className="text-center">Oportunidades</th>
                    <th className="text-center">Ventas</th>
                    <th>Estado</th>
                    <th className="w-12 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <Link
                          to={`/clients/${client.id}`}
                          className="group flex items-center gap-3"
                        >
                          <Avatar name={`${client.firstName} ${client.lastName}`} size="sm" />
                          <span className="min-w-0">
                            <span className="block max-w-[220px] truncate font-medium text-ink group-hover:text-brand-strong dark:group-hover:text-brand">
                              {client.firstName} {client.lastName}
                            </span>
                            <span className="mt-0.5 block max-w-[220px] truncate text-xs text-muted">
                              {client.jobTitle ?? 'Sin cargo'}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {client.company ? (
                          <Link
                            to={`/companies/${client.company.id}`}
                            className="inline-block max-w-[180px] truncate text-sm text-ink hover:text-brand-strong dark:hover:text-brand"
                          >
                            {client.company.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted">Sin empresa</span>
                        )}
                      </td>
                      <td>
                        <div className="min-w-0 text-xs">
                          <p className="truncate text-ink">{client.email}</p>
                          <p className="mt-0.5 truncate text-muted">
                            {client.phone ?? 'Sin tel├®fono'}
                          </p>
                        </div>
                      </td>
                      <td className="text-center text-sm tabular-nums text-muted">
                        {formatNumber(client._count?.opportunities ?? 0)}
                      </td>
                      <td className="text-center text-sm tabular-nums text-muted">
                        {formatNumber(client._count?.sales ?? 0)}
                      </td>
                      <td>
                        <ClientStatusBadge status={client.status} />
                      </td>
                      <td className="text-right">
                        <Dropdown
                          trigger={({ toggle }) => (
                            <button
                              type="button"
                              onClick={toggle}
                              className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                              aria-label={`Acciones para ${client.firstName} ${client.lastName}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}
                        >
                          {(close) => (
                            <>
                              <DropdownItem
                                icon={<Eye className="h-4 w-4" />}
                                onClick={() => {
                                  close();
                                  navigate(`/clients/${client.id}`);
                                }}
                              >
                                Ver detalle
                              </DropdownItem>
                              <DropdownItem
                                icon={<Pencil className="h-4 w-4" />}
                                onClick={() => {
                                  close();
                                  openEdit(client);
                                }}
                              >
                                Editar
                              </DropdownItem>
                              {canArchive(user?.role) && client.status === 'ACTIVE' ? (
                                <>
                                  <DropdownSeparator />
                                  <DropdownItem
                                    icon={<Archive className="h-4 w-4" />}
                                    danger
                                    disabled={archive.isPending}
                                    onClick={() => {
                                      close();
                                      void onArchive(client);
                                    }}
                                  >
                                    Archivar
                                  </DropdownItem>
                                </>
                              ) : null}
                            </>
                          )}
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
          </>
        )}
      </Card>

      <ClientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        client={editing}
        defaultCompanyId={defaultCompanyId}
      />
    </div>
  );
};
