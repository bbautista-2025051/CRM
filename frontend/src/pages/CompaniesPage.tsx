import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Building2,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSectors } from '@/hooks/queries';
import { companiesApi } from '@/lib/endpoints';
import { canArchive } from '@/lib/permissions';
import { formatNumber, initials } from '@/lib/format';
import { CompanyFormModal } from '@/components/companies/CompanyFormModal';
import { CompanyDetailModal } from '@/components/companies/CompanyDetailModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { CompanyStatusBadge } from '@/components/ui/StatusBadges';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import type { Company } from '@/types';
import { ApiError } from '@/lib/api';

export const CompaniesPage = () => {
  usePageTitle('Empresas');
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const sectors = useSectors();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setEditing(null);
    setFormOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sector]);

  const query = useQuery({
    queryKey: ['companies', 'list', { page, search: debouncedSearch, status, sector }],
    queryFn: () =>
      companiesApi.list({
        page,
        pageSize: 15,
        search: debouncedSearch || undefined,
        status: status || undefined,
        sector: sector || undefined,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => companiesApi.archive(id),
    onSuccess: (response) => {
      success('Empresa archivada', response.message);
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo archivar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setFormOpen(true);
  };

  const onArchive = async (company: Company) => {
    const accepted = await confirm({
      title: `Archivar ${company.name}`,
      description:
        'La empresa y todo su histórico se conservarán. No podrás asociarle nuevos clientes, oportunidades o ventas mientras esté archivada.',
      confirmLabel: 'Archivar empresa',
      variant: 'danger',
    });
    if (accepted) archive.mutate(company.id);
  };

  const companies = query.data?.data ?? [];
  const meta = query.data?.meta;
  const hasFilters = Boolean(debouncedSearch || status || sector);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Empresas"
        description="Centraliza las cuentas de tu cartera y consulta su actividad comercial."
        actions={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Nueva empresa
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, NIT o correo…"
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
              <option value="ACTIVE">Activas</option>
              <option value="ARCHIVED">Archivadas</option>
            </Select>
            <Select
              aria-label="Filtrar por sector"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              className="w-auto min-w-[150px]"
            >
              <option value="">Todos los sectores</option>
              {sectors.data?.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setSector('');
                }}
              >
                Limpiar filtros
              </Button>
            ) : null}
            <span className="ml-auto text-xs text-muted">
              {meta ? `${formatNumber(meta.total)} empresas` : ''}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={hasFilters ? 'No encontramos empresas' : 'Tu cartera empieza aquí'}
            description={
              hasFilters
                ? 'Prueba con otros filtros o limpia la búsqueda.'
                : 'Registra tu primera empresa para organizar clientes, oportunidades y ventas.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatus('');
                    setSector('');
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
                  Nueva empresa
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
                    <th>Empresa</th>
                    <th>Contacto</th>
                    <th className="text-center">Clientes</th>
                    <th className="text-center">Oportunidades</th>
                    <th className="text-center">Ventas</th>
                    <th>Estado</th>
                    <th className="w-12 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setDetailId(company.id)}
                          className="group flex items-center gap-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand-strong dark:text-brand">
                            {initials(company.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[240px] truncate font-medium text-ink group-hover:text-brand-strong dark:group-hover:text-brand">
                              {company.name}
                            </span>
                            <span className="mt-0.5 block max-w-[240px] truncate text-xs text-muted">
                              {company.sector ?? 'Sin sector'}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td>
                        <div className="min-w-0 text-xs">
                          <p className="truncate text-ink">{company.email ?? '—'}</p>
                          <p className="mt-0.5 truncate text-muted">{company.phone ?? 'Sin teléfono'}</p>
                        </div>
                      </td>
                      <td className="text-center text-sm tabular-nums text-muted">
                        {formatNumber(company._count?.clients ?? 0)}
                      </td>
                      <td className="text-center text-sm tabular-nums text-muted">
                        {formatNumber(company._count?.opportunities ?? 0)}
                      </td>
                      <td className="text-center text-sm tabular-nums text-muted">
                        {formatNumber(company._count?.sales ?? 0)}
                      </td>
                      <td>
                        <CompanyStatusBadge status={company.status} />
                      </td>
                      <td className="text-right">
                        <Dropdown
                          trigger={({ toggle }) => (
                            <button
                              type="button"
                              onClick={toggle}
                              className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                              aria-label={`Acciones para ${company.name}`}
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
                                  setDetailId(company.id);
                                }}
                              >
                                Ver detalle
                              </DropdownItem>
                              <DropdownItem
                                icon={<Pencil className="h-4 w-4" />}
                                onClick={() => {
                                  close();
                                  openEdit(company);
                                }}
                              >
                                Editar
                              </DropdownItem>
                              {canArchive(user?.role) && company.status === 'ACTIVE' ? (
                                <>
                                  <DropdownSeparator />
                                  <DropdownItem
                                    icon={<Archive className="h-4 w-4" />}
                                    danger
                                    disabled={archive.isPending}
                                    onClick={() => {
                                      close();
                                      void onArchive(company);
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

      <CompanyFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        company={editing}
      />

      <CompanyDetailModal
        open={Boolean(detailId)}
        companyId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(comp) => {
          setDetailId(null);
          openEdit(comp);
        }}
      />
    </div>
  );
};
