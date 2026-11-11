import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Plus,
} from 'lucide-react';
import {
  ClientsIcon,
  ConversionIcon,
  OpportunitiesIcon,
  SalesIcon,
  WalletIcon,
} from '@/components/ui/NexoIcons';
import { useAuth } from '@/providers/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOpportunityStages } from '@/hooks/queries';
import { dashboardApi, unwrap, usersApi } from '@/lib/endpoints';
import { ROLE_LABELS } from '@/lib/labels';
import type { Role } from '@/types';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
} from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/Button';
import { CardsSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StageBadge, SaleStatusBadge } from '@/components/ui/StatusBadges';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import {
  ClientsChart,
  RevenueChart,
  SectorChart,
  StageChart,
} from '@/components/charts/DashboardCharts';
import { Select } from '@/components/ui/Input';

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const SectionHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-4">
    <div className="min-w-0">
      <h2 className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const DashboardPage = () => {
  usePageTitle('Panel');
  const { user } = useAuth();
  const opportunityStages = useOpportunityStages();
  const currentYear = new Date().getFullYear();
  const [roleFilter, setRoleFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(String(currentYear));

  const usersQuery = useQuery({
    queryKey: ['dashboard', 'users', 'ACTIVE', roleFilter],
    queryFn: () =>
      usersApi.list({
        page: 1,
        pageSize: 500,
        status: 'ACTIVE',
        role: roleFilter || undefined,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
  });

  const users = usersQuery.data?.data ?? [];

  const query = useQuery({
    queryKey: ['dashboard', 'summary', { role: roleFilter, userId: userFilter, month: monthFilter, year: yearFilter }],
    queryFn: async () =>
      unwrap(
        await dashboardApi.summary({
          role: roleFilter || undefined,
          userId: userFilter || undefined,
          month: monthFilter || undefined,
          year: yearFilter || undefined,
        }),
      ),
  });

  const months = useMemo(
    () => [
      { value: '', label: 'Todos los meses' },
      { value: '1', label: 'Enero' },
      { value: '2', label: 'Febrero' },
      { value: '3', label: 'Marzo' },
      { value: '4', label: 'Abril' },
      { value: '5', label: 'Mayo' },
      { value: '6', label: 'Junio' },
      { value: '7', label: 'Julio' },
      { value: '8', label: 'Agosto' },
      { value: '9', label: 'Septiembre' },
      { value: '10', label: 'Octubre' },
      { value: '11', label: 'Noviembre' },
      { value: '12', label: 'Diciembre' },
    ],
    [],
  );

  const years = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => String(currentYear - index)).reverse(),
    [currentYear],
  );

  const data = query.data;
  const primaryRevenue = data?.totals.salesByCurrency.find(
    (item) => item.currency === data.defaultCurrency,
  );
  const otherCurrencies = data?.totals.salesByCurrency.filter(
    (item) => item.currency !== data.defaultCurrency,
  );
  const todayLabel = formatDate(new Date(), "EEEE, d 'de' MMMM 'de' yyyy");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description={
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
          </span>
        }
        actions={
          <>
            <Link
              to="/sales?create=1"
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              <SalesIcon className="h-4 w-4" />
              Registrar venta
            </Link>
            <Link
              to="/opportunities?create=1"
              className={buttonStyles({ variant: 'primary', size: 'md' })}
            >
              <Plus className="h-4 w-4" />
              Nueva oportunidad
            </Link>
          </>
        }
      />

      <div className="border-y border-line py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Filtros
            </p>
            <p className="mt-0.5 text-[13px] text-muted">Usuario, rol, mes o año.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filtrar por rol"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                // Al cambiar el rol se recarga la lista de usuarios: la
                // selección previa puede no pertenecer al nuevo rol.
                setUserFilter('');
              }}
              className="min-w-[180px]"
            >
              <option value="">Todos los roles</option>
              {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por usuario"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              className="min-w-[220px]"
              disabled={usersQuery.isLoading}
            >
              <option value="">
                {roleFilter
                  ? `Todos (${ROLE_LABELS[roleFilter as Role]})`
                  : 'Todos los usuarios'}
              </option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {ROLE_LABELS[item.role]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por mes"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="min-w-[150px]"
            >
              {months.map((month) => (
                <option key={month.value || 'all'} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por año"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="min-w-[120px]"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <>
          <CardsSkeleton />
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="h-[300px] border-t border-line pt-5 xl:col-span-8">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-8 h-[220px] w-full" />
            </div>
            <div className="h-[300px] border-t border-line pt-5 xl:col-span-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-8 h-[220px] w-full" />
            </div>
          </div>
        </>
      ) : query.isError ? (
        <div className="border-y border-line py-8">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-5">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted">Ingresos confirmados</span>
                <WalletIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="metric text-2xl font-bold tracking-tight text-ink">
                  {formatMoney(primaryRevenue?.total ?? '0.00', data.defaultCurrency)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {data.totals.confirmedSales} ventas confirmadas
                  {otherCurrencies?.length
                    ? ` · ${otherCurrencies.map((item) => formatMoney(item.total, item.currency)).join(' · ')}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted">Pipeline abierto</span>
                <OpportunitiesIcon className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="metric text-2xl font-bold tracking-tight text-ink">
                  {formatMoney(data.totals.openValue, data.defaultCurrency)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {data.totals.openOpportunities} oportunidades abiertas
                </p>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted">Tasa de conversión</span>
                <ConversionIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="metric text-2xl font-bold tracking-tight text-ink">
                  {formatPercent(data.totals.conversionRate)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {data.totals.wonOpportunities} ganadas · {data.totals.lostOpportunities} perdidas
                </p>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted">Clientes activos</span>
                <ClientsIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="metric text-2xl font-bold tracking-tight text-ink">
                  {formatNumber(data.totals.clients)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {data.totals.activeCompanies} de {data.totals.companies} empresas activas
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="border-t border-line pt-5 xl:col-span-8">
              <SectionHeader
                title={monthFilter ? `Ingresos del mes ${months.find((item) => item.value === monthFilter)?.label ?? ''}` : `Ingresos del año ${yearFilter}`}
                description="Solo ventas con estado confirmada"
                action={
                  <Badge tone="brand" dot>
                    {data.defaultCurrency}
                  </Badge>
                }
              />
              <div className="mt-5 pb-3">
                <RevenueChart data={data.charts.monthlySales} currency={data.defaultCurrency} />
              </div>
            </section>

            <section className="border-t border-line pt-5 xl:col-span-4">
              <SectionHeader
                title="Embudo de oportunidades"
                description="Distribución actual por etapa"
                action={
                  <Link
                    to="/opportunities"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-strong hover:underline dark:text-brand"
                  >
                    Ver embudo <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <div className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Ganadas
                  </p>
                  <p className="metric mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {data.totals.wonOpportunities}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Perdidas
                  </p>
                  <p className="metric mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
                    {data.totals.lostOpportunities}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Conversión
                  </p>
                  <p className="metric mt-1 text-lg font-semibold text-ink">
                    {formatPercent(data.totals.conversionRate)}
                  </p>
                </div>
              </div>
              <div className="pb-2">
                <StageChart data={data.charts.opportunitiesByStage} />
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="border-t border-line pt-5 xl:col-span-7">
              <SectionHeader
                title="Oportunidades recientes"
                description="Últimas oportunidades creadas"
                action={
                  <Link
                    to="/opportunities"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-strong hover:underline dark:text-brand"
                  >
                    Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <div className="mt-3">
              {data.recentOpportunities.length === 0 ? (
                <EmptyState
                  icon={OpportunitiesIcon}
                  title="Todavía no hay oportunidades"
                  description="Registra tu primera oportunidad para empezar a medir el pipeline."
                  action={
                    <Link
                      to="/opportunities?create=1"
                      className={buttonStyles({ size: 'sm' })}
                    >
                      <Plus className="h-4 w-4" /> Nueva oportunidad
                    </Link>
                  }
                />
              ) : (
                <div className="table-wrap">
                  <table className="table-base min-w-[560px]">
                    <thead>
                      <tr>
                        <th>Oportunidad</th>
                        <th>Etapa</th>
                        <th className="text-right">Importe</th>
                        <th>Cierre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOpportunities.map((opportunity) => (
                        <tr key={opportunity.id}>
                          <td>
                            <Link
                              to={`/opportunities?open=${opportunity.id}`}
                              className="group block min-w-0"
                            >
                              <span className="block truncate font-medium text-ink group-hover:text-brand-strong dark:group-hover:text-brand">
                                {opportunity.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {[
                                  opportunity.company?.name,
                                  opportunity.client
                                    ? `${opportunity.client.firstName} ${opportunity.client.lastName}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || 'Sin empresa'}
                              </span>
                            </Link>
                          </td>
                          <td>
                            <StageBadge
                              stage={opportunity.stage}
                              label={opportunityStages.data?.find(
                                (item) => item.value === opportunity.stage,
                              )?.label}
                            />
                          </td>
                          <td className="whitespace-nowrap text-right font-medium text-ink">
                            {formatMoney(opportunity.value, data.defaultCurrency)}
                          </td>
                          <td className="whitespace-nowrap text-xs text-muted">
                            {formatDate(opportunity.expectedCloseDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </section>

            <section className="border-t border-line pt-5 xl:col-span-5">
              <SectionHeader
                title="Actividad del equipo"
                description="Últimos movimientos registrados"
                action={
                  <Link
                    to="/activity"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-strong hover:underline dark:text-brand"
                  >
                    Ver todo <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <div className="mt-3">
                <ActivityFeed items={data.recentActivity.slice(0, 6)} />
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="border-t border-line pt-5 xl:col-span-7">
              <SectionHeader
                title="Clientes por empresa"
                description="Cartera activa agrupada por empresa"
                action={
                  <Link
                    to="/clients"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-strong hover:underline dark:text-brand"
                  >
                    Gestionar <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <div className="mt-3">
                <ClientsChart data={data.charts.clientsByCompany} />
              </div>
            </section>

            <section className="border-t border-line pt-5 xl:col-span-5">
              <SectionHeader
                title="Empresas por sector"
                description="Composición de la cartera activa"
              />
              <div className="mt-3">
                <SectorChart data={data.charts.companiesBySector} />
              </div>
            </section>
          </div>

          <section className="border-t border-line pt-5">
            <SectionHeader
              title="Ventas recientes"
              description="Últimos registros de venta"
              action={
                <Link
                  to="/sales"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-strong hover:underline dark:text-brand"
                >
                  Ver ventas <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-3">
            {data.recentSales.length === 0 ? (
              <EmptyState
                icon={SalesIcon}
                title="Aún no hay ventas registradas"
                description="Cuando registres una venta aparecerá aquí con su estado y responsable."
                action={
                  <Link to="/sales?create=1" className={buttonStyles({ size: 'sm' })}>
                    <Plus className="h-4 w-4" /> Registrar venta
                  </Link>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Cliente</th>
                      <th>Responsable</th>
                      <th>Fecha</th>
                      <th className="text-right">Importe</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <Link
                            to={`/sales?open=${sale.id}`}
                            className="font-mono text-xs font-semibold text-brand-strong hover:underline dark:text-brand"
                          >
                            {sale.saleNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">
                              {sale.client
                                ? `${sale.client.firstName} ${sale.client.lastName}`
                                : sale.company?.name ?? '—'}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {sale.company?.name ?? 'Sin empresa'}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-2 text-xs text-muted">
                            {sale.owner ? (
                              <Avatar name={sale.owner.name} src={sale.owner.avatarUrl} size="xs" />
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Datos actualizados en tiempo real
            </span>
            <span>Última actualización: {formatDateTime(new Date())}</span>
          </div>
        </>
      ) : null}
    </div>
  );
};
