import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Handshake,
  Mail,
  Pencil,
  Phone,
  Plus,
  Target,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOpportunityStages } from '@/hooks/queries';
import { clientsApi, unwrap } from '@/lib/endpoints';
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
import { Avatar } from '@/components/ui/Avatar';
import {
  ClientStatusBadge,
  SaleStatusBadge,
  StageBadge,
} from '@/components/ui/StatusBadges';
import { ClientFormModal } from '@/components/clients/ClientFormModal';

type TabValue = 'opportunities' | 'sales';

export const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>('opportunities');
  const [editOpen, setEditOpen] = useState(false);
  const stages = useOpportunityStages();

  const query = useQuery({
    queryKey: ['clients', 'detail', id],
    queryFn: async () => unwrap(await clientsApi.get(id!)),
    enabled: Boolean(id),
  });

  const client = query.data;
  const fullName = client ? `${client.firstName} ${client.lastName}` : 'Cliente';
  usePageTitle(fullName);

  const archive = useMutation({
    mutationFn: () => clientsApi.archive(id!),
    onSuccess: (response) => {
      success('Cliente archivado', response.message);
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
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
    if (!client) return;
    const accepted = await confirm({
      title: `Archivar a ${fullName}`,
      description:
        'El cliente y todo su histórico comercial se conservarán. No podrás asociarle nuevas oportunidades o ventas mientras esté archivado.',
      confirmLabel: 'Archivar cliente',
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

  if (query.isError || !client) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Cliente"
          breadcrumbs={[{ label: 'Clientes', to: '/clients' }, { label: 'Detalle' }]}
        />
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      </div>
    );
  }

  const openOpportunities = client.opportunities.filter((item) => item.status === 'OPEN');
  const confirmedSales = client.sales.filter((item) => item.status === 'CONFIRMED');

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {fullName}
            <ClientStatusBadge status={client.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{client.jobTitle ?? 'Sin cargo'}</span>
            <span className="text-muted/40">·</span>
            <span>{client.email}</span>
            {client.company ? (
              <>
                <span className="text-muted/40">·</span>
                <span>{client.company.name}</span>
              </>
            ) : null}
          </span>
        }
        breadcrumbs={[{ label: 'Clientes', to: '/clients' }, { label: fullName }]}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate('/clients')}
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
            {canArchive(user?.role) && client.status === 'ACTIVE' ? (
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
          <CardHeader title="Información del cliente" description="Datos de contacto y registro" />
          <CardBody>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Nombre completo
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                  <Avatar name={fullName} size="xs" />
                  {fullName}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Cargo
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-muted" />
                  {client.jobTitle ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Correo
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted" />
                  <a
                    href={`mailto:${client.email}`}
                    className="text-brand-strong hover:underline dark:text-brand"
                  >
                    {client.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Teléfono
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted" />
                  {client.phone ?? <span className="text-muted">—</span>}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Empresa
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted" />
                  {client.company ? (
                    <Link
                      to={`/companies/${client.company.id}`}
                      className="text-brand-strong hover:underline dark:text-brand"
                    >
                      {client.company.name}
                    </Link>
                  ) : (
                    <span className="text-muted">Sin empresa asociada</span>
                  )}
                </dd>
              </div>
            </dl>

            {client.notes ? (
              <div className="mt-6 rounded-xl border border-line bg-elevated/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Notas internas
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">
                  {client.notes}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader title="Resumen comercial" />
            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <div className="px-3 py-4 text-center">
                <p className="text-xl font-semibold text-ink">
                  {formatNumber(openOpportunities.length)}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                  Oportunidades abiertas
                </p>
              </div>
              <div className="px-3 py-4 text-center">
                <p className="text-xl font-semibold text-ink">
                  {formatNumber(confirmedSales.length)}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                  Ventas confirmadas
                </p>
              </div>
            </div>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Creado</span>
                <span className="font-medium text-ink">{formatDate(client.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Actualizado</span>
                <span className="font-medium text-ink">{formatDateTime(client.updatedAt)}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <Tabs
          items={[
            {
              value: 'opportunities',
              label: 'Oportunidades',
              count: client.opportunities.length,
            },
            { value: 'sales', label: 'Ventas', count: client.sales.length },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'opportunities' ? (
          client.opportunities.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Sin oportunidades"
              description="Crea una oportunidad para dar seguimiento a este contacto."
              action={
                <Link
                  to={`/opportunities?create=1&clientId=${client.id}${client.companyId ? `&companyId=${client.companyId}` : ''}`}
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
                  {client.opportunities.map((opportunity) => (
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
          client.sales.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="Sin ventas registradas"
              description="Las ventas de este cliente aparecerán aquí."
              action={
                <Link
                  to={`/sales?create=1&clientId=${client.id}${client.companyId ? `&companyId=${client.companyId}` : ''}`}
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
                    <th>Empresa</th>
                    <th>Fecha</th>
                    <th className="text-right">Importe</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {client.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <Link
                          to={`/sales?open=${sale.id}`}
                          className="font-mono text-xs font-semibold text-brand-strong hover:underline dark:text-brand"
                        >
                          {sale.saleNumber}
                        </Link>
                      </td>
                      <td className="text-sm text-ink">{sale.company?.name ?? '—'}</td>
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

      <div className="flex items-center gap-2 text-[11px] text-muted">
        <UserRound className="h-3.5 w-3.5" />
        El histórico se conserva aunque el cliente sea archivado.
      </div>

      <ClientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['clients', 'detail', id] });
        }}
      />
    </div>
  );
};
