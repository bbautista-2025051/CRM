import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  Eye,
  MoreHorizontal,
  Ticket,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useClientOptions,
  useCompanyOptions,
  useUserOptions,
} from '@/hooks/queries';
import { salesApi } from '@/lib/endpoints';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';

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
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import type { Sale, TicketStage } from '@/types';

const STAGE_LABELS: Record<TicketStage, string> = {
  IN_PROGRESS: 'Progreso',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
};

const STAGE_TONES: Record<TicketStage, BadgeTone> = {
  IN_PROGRESS: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
};

const TicketStageBadge = ({ stage }: { stage: TicketStage | null }) => (
  <Badge tone={stage ? STAGE_TONES[stage] : 'neutral'} dot>
    {stage ? STAGE_LABELS[stage] : 'Sin etapa'}
  </Badge>
);

export const TicketsPage = () => {
  usePageTitle('Tickets');
  const { user } = useAuth();
  const navigate = useNavigate();
  const companies = useCompanyOptions('', true);
  const clients = useClientOptions({}, true);
  const users = useUserOptions(user?.role === 'ADMIN');

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [clientId, setClientId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stage, companyId, clientId, ownerId, dateFrom, dateTo]);

  const query = useQuery({
    queryKey: [
      'sales',
      'tickets',
      {
        page,
        search: debouncedSearch,
        stage,
        companyId,
        clientId,
        ownerId,
        dateFrom,
        dateTo,
      },
    ],
    queryFn: () =>
      salesApi.list({
        page,
        pageSize: 15,
        search: debouncedSearch || undefined,
        hasTicket: true,
        ticketStage: stage || undefined,
        companyId: companyId || undefined,
        clientId: clientId || undefined,
        ownerId: ownerId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: 'ticketNumber',
        sortOrder: 'desc',
      }),
  });

  const clearFilters = () => {
    setSearch('');
    setStage('');
    setCompanyId('');
    setClientId('');
    setOwnerId('');
    setDateFrom('');
    setDateTo('');
  };

  const tickets = query.data?.data ?? [];
  const meta = query.data?.meta;
  const hasFilters = Boolean(
    debouncedSearch ||
      stage ||
      companyId ||
      clientId ||
      ownerId ||
      dateFrom ||
      dateTo,
  );

  const openTicket = (sale: Sale) => navigate(`/tickets/${sale.id}`);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tickets"
        description="Consulta los tickets generados desde las ventas, filtra por su número, cliente, empresa o etapa y da seguimiento a cada caso."
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate('/negocio?view=sales')}
            leftIcon={<Wallet className="h-4 w-4" />}
          >
            Ir a ventas
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-start">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por No. ticket, cliente, empresa o venta…"
            className="xl:w-80"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              aria-label="Filtrar por etapa del ticket"
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className="w-auto min-w-[150px]"
            >
              <option value="">Todas las etapas</option>
              <option value="IN_PROGRESS">Progreso</option>
              <option value="ACCEPTED">Aceptada</option>
              <option value="REJECTED">Rechazada</option>
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
            <Select
              aria-label="Filtrar por cliente"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="w-auto min-w-[180px]"
            >
              <option value="">Todos los clientes</option>
              {clients.data?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
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
              {meta ? `${formatNumber(meta.total)} tickets` : ''}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title={hasFilters ? 'No encontramos tickets' : 'Aún no hay tickets'}
            description={
              hasFilters
                ? 'Prueba con otros filtros o limpia la búsqueda.'
                : 'Los tickets aparecen aquí cuando registras una venta con la opción Ticket en Sí.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => navigate('/negocio?view=sales')}
                  leftIcon={<Wallet className="h-4 w-4" />}
                >
                  Ir a ventas
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
                    <th>No. Ticket</th>
                    <th>Cliente / Empresa</th>
                    <th>Responsable</th>
                    <th>Etapa</th>
                    <th>Fecha</th>
                    <th className="text-right">Importe</th>
                    <th className="w-12 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((sale: Sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => openTicket(sale)}
                      className="cursor-pointer transition-colors hover:bg-elevated/50"
                    >
                      <td>
                        <div className="min-w-0 max-w-[220px]">
                          <span className="block truncate text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
                            {sale.opportunity?.name ?? sale.saleNumber}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-muted">
                            {sale.saleNumber}
                          </span>
                        </div>
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
                      <td>
                        <TicketStageBadge stage={sale.ticketStage} />
                      </td>
                      <td className="whitespace-nowrap text-xs text-muted">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="whitespace-nowrap text-right font-medium text-ink">
                        {formatMoney(sale.amount, sale.currency)}
                      </td>
                      <td className="text-right">
                        <Dropdown
                          trigger={({ toggle }) => (
                            <button
                              type="button"
                              onClick={(event) => {
                                event?.stopPropagation();
                                toggle();
                              }}
                              className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                              aria-label={`Acciones para el ticket ${
                                sale.ticketNumber ?? sale.saleNumber
                              }`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}
                        >
                          {(close) => (
                            <>
                              <DropdownItem
                                icon={<Eye className="h-4 w-4" />}
                                onClick={(event) => {
                                  event?.stopPropagation();
                                  close();
                                  openTicket(sale);
                                }}
                              >
                                Ver ticket
                              </DropdownItem>
                              <DropdownItem
                                icon={<Wallet className="h-4 w-4" />}
                                onClick={(event) => {
                                  event?.stopPropagation();
                                  close();
                                  navigate(`/negocio/venta/${sale.id}`);
                                }}
                              >
                                Ver venta
                              </DropdownItem>
                              <DropdownSeparator />
                              <DropdownItem
                                icon={<Clock3 className="h-4 w-4" />}
                                onClick={(event) => {
                                  event?.stopPropagation();
                                  close();
                                  setStage('IN_PROGRESS');
                                }}
                              >
                                Filtrar en progreso
                              </DropdownItem>
                              <DropdownItem
                                icon={<CheckCircle2 className="h-4 w-4" />}
                                onClick={(event) => {
                                  event?.stopPropagation();
                                  close();
                                  setStage('ACCEPTED');
                                }}
                              >
                                Filtrar aceptadas
                              </DropdownItem>
                              <DropdownItem
                                icon={<XCircle className="h-4 w-4" />}
                                onClick={(event) => {
                                  event?.stopPropagation();
                                  close();
                                  setStage('REJECTED');
                                }}
                              >
                                Filtrar rechazadas
                              </DropdownItem>
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
    </div>
  );
};
