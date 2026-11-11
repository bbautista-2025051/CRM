import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  Handshake,
  Pencil,
  Trash2,
  UserRound,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { StageBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { opportunitiesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import {
  canDeleteOpportunity,
  canManageOpportunity,
} from '@/lib/permissions';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { OPPORTUNITY_STATUS_LABELS } from '@/lib/labels';
import { usePageTitle } from '@/hooks/usePageTitle';

export const OpportunityDetailPage = () => {
  usePageTitle('Detalle de oportunidad');
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const opportunityId = id;

  const query = useQuery({
    queryKey: ['opportunities', 'detail', opportunityId],
    queryFn: async () => unwrap(await opportunitiesApi.get(opportunityId!)),
    enabled: Boolean(opportunityId),
  });

  const opportunity = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['companies'] });
    void queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const remove = useMutation({
    mutationFn: () => opportunitiesApi.remove(opportunityId!),
    onSuccess: () => {
      success('Oportunidad eliminada', 'El registro se eliminó correctamente.');
      invalidate();
      navigate('/negocio');
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const onDelete = async () => {
    if (!opportunity) return;
    const accepted = await confirm({
      title: `Eliminar ${opportunity.name}`,
      description:
        'Esta acción es permanente. Solo es posible si la oportunidad no tiene una venta asociada.',
      confirmLabel: 'Eliminar oportunidad',
      variant: 'danger',
    });
    if (accepted) remove.mutate();
  };

  const canManage = opportunity
    ? canManageOpportunity(user?.role, user?.id, opportunity.ownerId)
    : false;
  const canDelete = opportunity
    ? canDeleteOpportunity(
        user?.role,
        user?.id,
        opportunity.ownerId,
        Boolean(opportunity.sale),
      )
    : false;
  const canCreateSale =
    opportunity?.stage === 'GANADA' && !opportunity.sale && canManage;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]">
            {opportunity?.name ?? ''}
            {opportunity ? (
              <span className="ml-2 inline-flex items-center gap-1.5">
                <StageBadge stage={opportunity.stage} label={OPPORTUNITY_STATUS_LABELS[opportunity.status] ?? opportunity.status} />
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {opportunity
              ? opportunity.client
                ? `${opportunity.client.firstName} ${opportunity.client.lastName} · ${opportunity.company?.name ?? 'Sin empresa'}`
                : `Sin cliente · ${opportunity.company?.name ?? 'Sin empresa'}`
              : 'Detalle de la oportunidad'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          {opportunity && canDelete ? (
            <Button
              variant="danger"
              onClick={() => void onDelete()}
              loading={remove.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Eliminar oportunidad
            </Button>
          ) : null}
          {opportunity && canManage ? (
            <Button
              onClick={() => navigate(`/negocio/oportunidad/${opportunity.id}/editar`)}
              leftIcon={<Pencil className="h-4 w-4" />}
            >
              Editar
            </Button>
          ) : null}
          {opportunity && canCreateSale ? (
            <Button
              onClick={() =>
                navigate(`/negocio/nuevo?view=sales&opportunityId=${opportunity.id}`)
              }
              leftIcon={<Handshake className="h-4 w-4" />}
            >
              Registrar venta
            </Button>
          ) : null}
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError || !opportunity ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="border-y border-line py-3.5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Importe estimado
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                  {formatMoney(opportunity.value)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Probabilidad
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {opportunity.probability}%
                </p>
              </div>
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Etapa
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <StageBadge
                  stage={opportunity.stage}
                  label={
                    opportunity.stage === 'NEGOCIACION'
                      ? 'Negociación'
                      : opportunity.stage === 'GANADA'
                        ? 'Ganada'
                        : 'Perdida'
                  }
                />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Estado
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                {opportunity.status === 'OPEN'
                  ? 'Abierta'
                  : opportunity.status === 'WON'
                    ? 'Ganada'
                    : 'Perdida'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Responsable
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                {opportunity.owner ? (
                  <>
                    <Avatar
                      name={opportunity.owner.name}
                      src={opportunity.owner.avatarUrl}
                      size="xs"
                    />
                    {opportunity.owner.name}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Cliente
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <UserRound className="h-3.5 w-3.5 text-muted" />
                {opportunity.client ? (
                  <a
                    href={`/clients/${opportunity.client.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {opportunity.client.firstName} {opportunity.client.lastName}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Empresa
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <Building2 className="h-3.5 w-3.5 text-muted" />
                {opportunity.company ? (
                  <a
                    href={`/companies/${opportunity.company.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {opportunity.company.name}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Cierre estimado
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <CalendarDays className="h-3.5 w-3.5 text-muted" />
                {formatDate(opportunity.expectedCloseDate)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Creada
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDateTime(opportunity.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Última actualización
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDateTime(opportunity.updatedAt)}</dd>
            </div>
          </dl>

          {opportunity.sale ? (
            <div className="border-t border-line pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Venta asociada
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Handshake className="h-3.5 w-3.5" />
                <a
                  href={`/negocio/venta/${opportunity.sale.id}`}
                  className="hover:underline font-medium"
                >
                  {opportunity.sale.saleNumber}
                </a>
              </div>
            </div>
          ) : null}

          {opportunity.description ? (
            <div className="border-t border-line pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Descripción
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">
                {opportunity.description}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
