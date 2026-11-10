import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArrowLeft,
  Building2,
  ExternalLink,
  Globe2,
  Handshake,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Target,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOpportunityStages } from '@/hooks/queries';
import { companiesApi, unwrap } from '@/lib/endpoints';
import { canArchive } from '@/lib/permissions';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ClientStatusBadge,
  CompanyStatusBadge,
  SaleStatusBadge,
  StageBadge,
} from '@/components/ui/StatusBadges';
import { CompanyFormModal } from '@/components/companies/CompanyFormModal';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

type TabValue = 'clients' | 'opportunities' | 'sales';

export const CompanyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>('clients');
  const [editOpen, setEditOpen] = useState(false);
  const stages = useOpportunityStages();

  const query = useQuery({
    queryKey: ['companies', 'detail', id],
    queryFn: async () => unwrap(await companiesApi.get(id!)),
    enabled: Boolean(id),
  });

  const company = query.data;
  usePageTitle(company?.name ?? 'Empresa');

  const archive = useMutation({
    mutationFn: () => companiesApi.archive(id!),
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

  const onArchive = async () => {
    if (!company) return;
    const accepted = await confirm({
      title: `Archivar ${company.name}`,
      description:
        'La empresa y todo su histórico se conservarán. No podrás asociarle nuevos registros mientras esté archivada.',
      confirmLabel: 'Archivar empresa',
      variant: 'danger',
    });
    if (accepted) archive.mutate();
  };

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card h-64 p-5 lg:col-span-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
          <div className="card h-64 p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !company) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Empresa"
          breadcrumbs={[{ label: 'Empresas', to: '/companies' }, { label: 'Detalle' }]}
        />
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      </div>
    );
  }

  const openOpportunities = company.opportunities.filter((item) => item.status === 'OPEN');
  const confirmedSales = company.sales.filter((item) => item.status === 'CONFIRMED');

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {company.name}
            <CompanyStatusBadge status={company.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{company.sector ?? 'Sin sector'}</span>
            {company.legalName ? (
              <>
                <span className="text-muted/40">·</span>
                <span>{company.legalName}</span>
              </>
            ) : null}
            {company.taxId ? (
              <>
                <span className="text-muted/40">·</span>
                <span>NIT {company.taxId}</span>
              </>
            ) : null}
          </span>
        }
        breadcrumbs={[{ label: 'Empresas', to: '/companies' }, { label: company.name }]}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate('/companies')}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              leftIcon={<Pencil className="h-4 w-4" />}
            >
              Editar
            </Button>
            {canArchive(user?.role) && company.status === 'ACTIVE' ? (
              <Button
                variant="danger"
                onClick={() => void onArchive()}
                loading={archive.isPending}
                leftIcon={<Archive className="h-4 w-4" />}
              >
                Archivar
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader title="Información de la empresa" description="Datos de contacto y registro" />
          <CardBody>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Nombre comercial
                </dt>
                <dd className="mt-1 text-sm text-ink">{company.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Razón social
                </dt>
                <dd className="mt-1 text-sm text-ink">{company.legalName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  NIT / Identificación
                </dt>
                <dd className="mt-1 text-sm text-ink">{company.taxId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Sector
                </dt>
                <dd className="mt-1 text-sm text-ink">{company.sector ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Correo
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted" />
                  {company.email ? (
                    <a href={`mailto:${company.email}`} className="text-brand-strong hover:underline dark:text-brand">
                      {company.email}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Teléfono
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted" />
                  {company.phone ?? <span className="text-muted">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Sitio web
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Globe2 className="h-3.5 w-3.5 text-muted" />
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand-strong hover:underline dark:text-brand"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Dirección
                </dt>
                <dd className="mt-1 flex items-start gap-1.5 text-sm">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                  {company.address ?? <span className="text-muted">—</span>}
                </dd>
              </div>
            </dl>

            {company.notes ? (
              <div className="mt-6 rounded-xl border border-line bg-elevated/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Notas internas
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">
                  {company.notes}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader title="Resumen comercial" />
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              <div className="px-3 py-4 text-center">
                <p className="text-xl font-semibold text-ink">{formatNumber(company.clients.length)}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">Clientes</p>
              </div>
              <div className="px-3 py-4 text-center">
                <p className="text-xl font-semibold text-ink">{formatNumber(openOpportunities.length)}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">Abiertas</p>
              </div>
              <div className="px-3 py-4 text-center">
                <p className="text-xl font-semibold text-ink">{formatNumber(confirmedSales.length)}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">Ventas</p>
              </div>
            </div>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Creada</span>
                <span className="font-medium text-ink">{formatDate(company.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Actualizada</span>
                <span className="font-medium text-ink">{formatDateTime(company.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted">Registrada por</span>
                {company.createdBy ? (
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
                    <Avatar name={company.createdBy.name} size="xs" className="h-5 w-5 text-[8px]" />
                    <span className="truncate">{company.createdBy.name}</span>
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Acciones rápidas" />
            <CardBody className="grid gap-2">
              <Link
                to={`/clients?create=1&companyId=${company.id}`}
                className={buttonStyles({ variant: 'secondary', size: 'sm', fullWidth: true, className: 'justify-start' })}
              >
                <Plus className="h-4 w-4" /> Añadir cliente
              </Link>
              <Link
                to={`/opportunities?create=1&companyId=${company.id}`}
                className={buttonStyles({ variant: 'secondary', size: 'sm', fullWidth: true, className: 'justify-start' })}
              >
                <Target className="h-4 w-4" /> Nueva oportunidad
              </Link>
              <Link
                to={`/sales?create=1&companyId=${company.id}`}
                className={buttonStyles({ variant: 'secondary', size: 'sm', fullWidth: true, className: 'justify-start' })}
              >
                <Handshake className="h-4 w-4" /> Registrar venta
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <Tabs
          items={[
            { value: 'clients', label: 'Clientes', count: company.clients.length },
            { value: 'opportunities', label: 'Oportunidades', count: company.opportunities.length },
            { value: 'sales', label: 'Ventas', count: company.sales.length },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'clients' ? (
          company.clients.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Sin clientes asociados"
              description="Añade el primer contacto de esta empresa."
              action={
                <Link
                  to={`/clients?create=1&companyId=${company.id}`}
                  className={buttonStyles({ size: 'sm' })}
                >
                  <Plus className="h-4 w-4" /> Añadir cliente
                </Link>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th className="text-center">Oportunidades</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {company.clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <Link to={`/clients/${client.id}`} className="group flex items-center gap-3">
                          <Avatar name={`${client.firstName} ${client.lastName}`} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink group-hover:text-brand-strong dark:group-hover:text-brand">
                              {client.firstName} {client.lastName}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {client.jobTitle ?? 'Sin cargo'}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="text-xs text-muted">{client.email}</td>
                      <td className="text-xs text-muted">{client.phone ?? '—'}</td>
                      <td className="text-center text-sm text-muted">
                        {client._count?.opportunities ?? 0}
                      </td>
                      <td>
                        <ClientStatusBadge status={client.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === 'opportunities' ? (
          company.opportunities.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Sin oportunidades"
              description="Crea una oportunidad para dar seguimiento a esta cuenta."
              action={
                <Link
                  to={`/opportunities?create=1&companyId=${company.id}`}
                  className={buttonStyles({ size: 'sm' })}
                >
                  <Plus className="h-4 w-4" /> Nueva oportunidad
                </Link>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Oportunidad</th>
                    <th>Responsable</th>
                    <th>Etapa</th>
                    <th className="text-right">Importe</th>
                    <th>Cierre estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {company.opportunities.map((opportunity) => (
                    <tr key={opportunity.id}>
                      <td>
                        <Link
                          to={`/opportunities?open=${opportunity.id}`}
                          className="block max-w-[280px] truncate font-medium text-ink hover:text-brand-strong dark:hover:text-brand"
                        >
                          {opportunity.name}
                        </Link>
                        {opportunity.sale ? (
                          <span className="mt-0.5 block text-[11px] text-emerald-600 dark:text-emerald-400">
                            Venta {opportunity.sale.saleNumber}
                          </span>
                        ) : null}
                      </td>
                      <td className="text-xs text-muted">{opportunity.owner?.name ?? '—'}</td>
                      <td>
                        <StageBadge
                          stage={opportunity.stage}
                          label={stages.data?.find((item) => item.value === opportunity.stage)?.label}
                        />
                      </td>
                      <td className="whitespace-nowrap text-right font-medium text-ink">
                        {formatMoney(opportunity.value)}
                      </td>
                      <td className="whitespace-nowrap text-xs text-muted">
                        {formatDate(opportunity.expectedCloseDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === 'sales' ? (
          company.sales.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="Sin ventas registradas"
              description="Las ventas asociadas a esta empresa aparecerán aquí."
              action={
                <Link
                  to={`/sales?create=1&companyId=${company.id}`}
                  className={buttonStyles({ size: 'sm' })}
                >
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
                    <th>Fecha</th>
                    <th className="text-right">Importe</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {company.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <Link
                          to={`/sales?open=${sale.id}`}
                          className="font-mono text-xs font-semibold text-brand-strong hover:underline dark:text-brand"
                        >
                          {sale.saleNumber}
                        </Link>
                      </td>
                      <td className="text-sm text-ink">
                        {sale.client
                          ? `${sale.client.firstName} ${sale.client.lastName}`
                          : '—'}
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
          )
        ) : null}
      </Card>

      <div className={cn('flex items-center gap-2 text-[11px] text-muted')}>
        <Building2 className="h-3.5 w-3.5" />
        Los registros se conservan aunque la empresa sea archivada.
      </div>

      <CompanyFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        company={company}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['companies', 'detail', id] });
        }}
      />
    </div>
  );
};
