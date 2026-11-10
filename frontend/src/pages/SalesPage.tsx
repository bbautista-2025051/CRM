import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Eye,
  Handshake,
  MoreHorizontal,
  Pencil,
  Plus,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCompanyOptions, useUserOptions } from '@/hooks/queries';
import { salesApi, unwrap } from '@/lib/endpoints';
import {
  canCancelSale,
  canConfirmSales,
  canEditSale,
} from '@/lib/permissions';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { SaleFormModal } from '@/components/sales/SaleFormModal';
import { SaleDetailModal } from '@/components/sales/SaleDetailModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Input, Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { SaleStatusBadge } from '@/components/ui/StatusBadges';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import type { Sale } from '@/types';

export const SalesPage = () => {
  usePageTitle('Negocio');
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const companies = useCompanyOptions('', true);
  const users = useUserOptions(user?.role === 'ADMIN');

  const createRequested = searchParams.get('create') === '1';
  const openRequested = searchParams.get('open');
  const companyParam = searchParams.get('companyId') ?? '';
  const clientParam = searchParams.get('clientId') ?? '';
  const opportunityParam = searchParams.get('opportunityId') ?? '';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [companyId, setCompanyId] = useState(companyParam);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState<string | undefined>();
  const [defaultClientId, setDefaultClientId] = useState<string | undefined>();
  const [defaultOpportunityId, setDefaultOpportunityId] = useState<
    string | undefined
  >();
  const [openId, setOpenId] = useState<string | null>(openRequested);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, ownerId, companyId, dateFrom, dateTo]);

  useEffect(() => {
    if (!createRequested && !openRequested) return;
    if (openRequested) setOpenId(openRequested);
    if (createRequested) {
      setEditing(null);
      setDefaultCompanyId(companyParam || undefined);
      setDefaultClientId(clientParam || undefined);
      setDefaultOpportunityId(opportunityParam || undefined);
      if (companyParam) setCompanyId(companyParam);
      setFormOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    next.delete('open');
    next.delete('companyId');
    next.delete('clientId');
    next.delete('opportunityId');
    setSearchParams(next, { replace: true });
    // Solo se ejecuta cuando la URL trae una acción puntual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequested, openRequested, companyParam, clientParam, opportunityParam]);

  const query = useQuery({
    queryKey: [
      'sales',
      'list',
      {
        page,
        search: debouncedSearch,
        status,
        ownerId,
        companyId,
        dateFrom,
        dateTo,
      },
    ],
    queryFn: () =>
      salesApi.list({
        page,
        pageSize: 15,
        search: debouncedSearch || undefined,
        status: status || undefined,
        ownerId: ownerId || undefined,
        companyId: companyId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: 'saleDate',
        sortOrder: 'desc',
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ['sales', 'summary', dateFrom, dateTo],
    queryFn: async () =>
      unwrap(
        await salesApi.summary({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      ),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['companies'] });
    void queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const confirmSale = useMutation({
    mutationFn: (id: string) => salesApi.confirm(id),
    onSuccess: () => {
      success('Venta confirmada', 'La venta ya suma a los ingresos confirmados.');
      invalidate();
    },
    onError: (error) => {
      toastError(
        'No se pudo confirmar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const cancelSale = useMutation({
    mutationFn: (id: string) => salesApi.cancel(id),
    onSuccess: (response) => {
      success('Venta cancelada', response.message);
      invalidate();
    },
    onError: (error) => {
      toastError(
        'No se pudo cancelar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDefaultCompanyId(companyId || undefined);
    setDefaultClientId(undefined);
    setDefaultOpportunityId(undefined);
    setFormOpen(true);
  };

  const openEdit = (sale: Sale) => {
    setOpenId(null);
    setEditing(sale);
    setDefaultCompanyId(undefined);
    setDefaultClientId(undefined);
    setDefaultOpportunityId(undefined);
    setFormOpen(true);
  };

  const onConfirm = async (sale: Sale) => {
    const accepted = await confirm({
      title: `Confirmar la venta ${sale.saleNumber}`,
      description: `${formatMoney(sale.amount, sale.currency)} pasará a contar como ingreso confirmado. Después solo un administrador podrá modificarla.`,
      confirmLabel: 'Confirmar venta',
    });
    if (accepted) confirmSale.mutate(sale.id);
  };

  const onCancel = async (sale: Sale) => {
    const accepted = await confirm({
      title: `Cancelar la venta ${sale.saleNumber}`,
      description:
        'La venta se conservará en el histórico con estado cancelada. Esta acción no se puede revertir.',
      confirmLabel: 'Cancelar venta',
      cancelLabel: 'Volver',
      variant: 'danger',
    });
    if (accepted) cancelSale.mutate(sale.id);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setOwnerId('');
    setCompanyId('');
    setDateFrom('');
    setDateTo('');
  };

  const sales = query.data?.data ?? [];
  const meta = query.data?.meta;
  const summary = summaryQuery.data;
  const hasFilters = Boolean(
    debouncedSearch || status || ownerId || companyId || dateFrom || dateTo,
  );
  const confirmedTotals = summary?.byCurrency ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ventas"
        description="Registra y confirma operaciones. Solo las ventas confirmadas cuentan como ingresos."
        actions={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Registrar venta
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas totales"
          value={summary ? formatNumber(summary.total) : '—'}
          hint={
            summary
              ? `${summary.counts.PENDING} pendientes · ${summary.counts.CONFIRMED} confirmadas`
              : 'Cargando resumen…'
          }
          icon={Handshake}
          tone="brand"
        />
        <StatCard
          label="Confirmadas"
          value={summary ? formatNumber(summary.counts.CONFIRMED) : '—'}
          hint="Suman a los ingresos"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Pendientes"
          value={summary ? formatNumber(summary.counts.PENDING) : '—'}
          hint="Esperan validación de un administrador"
          icon={CalendarDays}
          tone="amber"
        />
        <StatCard
          label="Canceladas"
          value={summary ? formatNumber(summary.counts.CANCELLED) : '—'}
          hint="Conservadas para auditoría"
          icon={Ban}
          tone="rose"
        />
      </div>

      {confirmedTotals.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line py-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Wallet className="h-4 w-4" /> Ingresos confirmados
          </span>
          {confirmedTotals.map((item) => (
            <span key={item.currency} className="flex items-baseline gap-2">
              <span className="metric text-base font-semibold text-ink">
                {formatMoney(item.confirmedTotal, item.currency)}
              </span>
              <span className="text-[11px] text-muted">
                {formatNumber(item.confirmedCount)} ventas · {item.currency}
              </span>
            </span>
          ))}
          {dateFrom || dateTo ? (
            <span className="ml-auto text-[11px] text-muted">
              Periodo filtrado
            </span>
          ) : (
            <span className="ml-auto text-[11px] text-muted">Histórico completo</span>
          )}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por número, cliente o empresa…"
            className="xl:w-72"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-auto min-w-[140px]"
            >
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="CANCELLED">Canceladas</option>
            </Select>
            <Select
              aria-label="Filtrar por empresa"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="w-auto min-w-[170px]"
            >
              <option value="">Todas las empresas</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            {user?.role === 'ADMIN' ? (
              <Select
                aria-label="Filtrar por responsable"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                className="w-auto min-w-[160px]"
              >
                <option value="">Todos los responsables</option>
                {users.data?.data.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <Input
              type="date"
              aria-label="Ventas desde"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-auto"
            />
            <Input
              type="date"
              aria-label="Ventas hasta"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-auto"
            />
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
            <span className="ml-auto text-xs text-muted">
              {meta ? `${formatNumber(meta.total)} ventas` : ''}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title={hasFilters ? 'No encontramos ventas' : 'Aún no hay ventas'}
            description={
              hasFilters
                ? 'Prueba con otros filtros o limpia la búsqueda.'
                : 'Registra la primera venta para empezar a medir los ingresos.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={openCreate}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Registrar venta
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
                    <th>Número</th>
                    <th>Cliente / Empresa</th>
                    <th>Responsable</th>
                    <th>Fecha</th>
                    <th className="text-right">Importe</th>
                    <th>Estado</th>
                    <th className="w-12 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const editable = canEditSale(
                      user?.role,
                      user?.id,
                      sale.ownerId,
                      sale.status,
                    );
                    const cancellable = canCancelSale(
                      user?.role,
                      user?.id,
                      sale.ownerId,
                      sale.status,
                    );
                    const confirmable =
                      sale.status === 'PENDING' && canConfirmSales(user?.role);
                    return (
                      <tr key={sale.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => setOpenId(sale.id)}
                            className="font-mono text-xs font-semibold text-brand-strong hover:underline dark:text-brand"
                          >
                            {sale.saleNumber}
                          </button>
                          {sale.opportunity ? (
                            <span className="mt-0.5 block max-w-[170px] truncate text-[11px] text-muted">
                              {sale.opportunity.name}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <div className="min-w-0 max-w-[230px]">
                            <p className="truncate font-medium text-ink">
                              {sale.client
                                ? `${sale.client.firstName} ${sale.client.lastName}`
                                : 'Sin cliente'}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {sale.company?.name ?? 'Sin empresa'}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-2 text-xs text-muted">
                            {sale.owner ? (
                              <Avatar name={sale.owner.name} size="xs" />
                            ) : null}
                            {sale.owner?.name ?? '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-xs text-muted">
                          {formatDate(sale.saleDate)}
                        </td>
                        <td className="whitespace-nowrap text-right font-medium text-ink">
                          {formatMoney(sale.amount, sale.currency)}
                        </td>
                        <td>
                          <SaleStatusBadge status={sale.status} />
                        </td>
                        <td className="text-right">
                          <Dropdown
                            trigger={({ toggle }) => (
                              <button
                                type="button"
                                onClick={toggle}
                                className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                                aria-label={`Acciones para la venta ${sale.saleNumber}`}
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
                                    setOpenId(sale.id);
                                  }}
                                >
                                  Ver detalle
                                </DropdownItem>
                                {editable ? (
                                  <DropdownItem
                                    icon={<Pencil className="h-4 w-4" />}
                                    onClick={() => {
                                      close();
                                      openEdit(sale);
                                    }}
                                  >
                                    Editar
                                  </DropdownItem>
                                ) : null}
                                {confirmable || cancellable ? (
                                  <DropdownSeparator />
                                ) : null}
                                {confirmable ? (
                                  <DropdownItem
                                    icon={<CheckCircle2 className="h-4 w-4" />}
                                    onClick={() => {
                                      close();
                                      void onConfirm(sale);
                                    }}
                                  >
                                    Confirmar
                                  </DropdownItem>
                                ) : null}
                                {cancellable ? (
                                  <DropdownItem
                                    icon={<Ban className="h-4 w-4" />}
                                    danger
                                    onClick={() => {
                                      close();
                                      void onCancel(sale);
                                    }}
                                  >
                                    Cancelar
                                  </DropdownItem>
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

      <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-muted">
        <Badge tone="neutral">Política</Badge>
        Las ventas no se eliminan: se cancelan para conservar el histórico. Una venta
        confirmada solo puede modificarla un administrador.
        {user?.role !== 'ADMIN' ? (
          <Link
            to="/settings?tab=security"
            className="font-medium text-brand-strong hover:underline dark:text-brand"
          >
            Gestionar mi cuenta
          </Link>
        ) : null}
      </div>

      <SaleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        sale={editing}
        defaultCompanyId={defaultCompanyId}
        defaultClientId={defaultClientId}
        defaultOpportunityId={defaultOpportunityId}
      />

      <SaleDetailModal
        saleId={openId}
        onClose={() => setOpenId(null)}
        onEdit={openEdit}
      />
    </div>
  );
};
