import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  Handshake,
  Pencil,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { SaleStatusBadge, StageBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { opportunitiesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { canDeleteOpportunity, canManageOpportunity } from '@/lib/permissions';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { OPPORTUNITY_STATUS_LABELS } from '@/lib/labels';
import type { Opportunity } from '@/types';

export const OpportunityDetailModal = ({
  opportunityId,
  onClose,
  onEdit,
}: {
  opportunityId: string | null;
  onClose: () => void;
  onEdit: (opportunity: Opportunity) => void;
}) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['opportunities', 'detail', opportunityId],
    queryFn: async () => unwrap(await opportunitiesApi.get(opportunityId!)),
    enabled: Boolean(opportunityId),
  });

  const opportunity = query.data;

  const remove = useMutation({
    mutationFn: () => opportunitiesApi.remove(opportunityId!),
    onSuccess: () => {
      success('Oportunidad eliminada', 'El registro se eliminó correctamente.');
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
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
    <Modal
      open={Boolean(opportunityId)}
      onClose={onClose}
      size="lg"
      fullWindow
      title={opportunity?.name ?? 'Oportunidad'}
      description={
        opportunity
          ? `${opportunity.company?.name ?? 'Sin empresa'}${
              opportunity.client
                ? ` · ${opportunity.client.firstName} ${opportunity.client.lastName}`
                : ''
            }`
          : 'Detalle de la oportunidad'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {opportunity && canCreateSale ? (
            <Link
              to={`/sales?create=1&opportunityId=${opportunity.id}`}
              className={buttonStyles({ variant: 'success' })}
              onClick={onClose}
            >
              <Handshake className="h-4 w-4" /> Registrar venta
            </Link>
          ) : null}
          {opportunity && canDelete ? (
            <Button
              variant="danger"
              onClick={() => void onDelete()}
              loading={remove.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Eliminar
            </Button>
          ) : null}
          {opportunity && canManage ? (
            <Button onClick={() => onEdit(opportunity)} leftIcon={<Pencil className="h-4 w-4" />}>
              Editar
            </Button>
          ) : null}
        </>
      }
    >
      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError || !opportunity ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={opportunity.stage} />
            <Badge
              tone={
                opportunity.status === 'WON'
                  ? 'success'
                  : opportunity.status === 'LOST'
                    ? 'danger'
                    : 'info'
              }
            >
              {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
            </Badge>
            <span className="text-xs text-muted">
              Creada {formatDateTime(opportunity.createdAt)}
            </span>
          </div>

          <div className="border-y border-line py-3.5">
            <div className="flex items-end justify-between gap-4">
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
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, Math.max(0, opportunity.probability))}%` }}
              />
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Empresa
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <Building2 className="h-3.5 w-3.5 text-muted" />
                {opportunity.company ? (
                  <Link
                    to={`/companies/${opportunity.company.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {opportunity.company.name}
                  </Link>
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
                  <Link
                    to={`/clients/${opportunity.client.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {opportunity.client.firstName} {opportunity.client.lastName}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Responsable
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                {opportunity.owner ? (
                  <>
                    <Avatar name={opportunity.owner.name} size="xs" />
                    {opportunity.owner.name}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Cierre estimado
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <CalendarDays className="h-3.5 w-3.5 text-muted" />
                {formatDate(opportunity.expectedCloseDate)}
              </dd>
            </div>
            {opportunity.wonAt ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Ganada el
                </dt>
                <dd className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                  {formatDate(opportunity.wonAt)}
                </dd>
              </div>
            ) : null}
            {opportunity.lostAt ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Perdida el
                </dt>
                <dd className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                  {formatDate(opportunity.lostAt)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Última actualización
              </dt>
              <dd className="mt-1 text-sm text-ink">
                {formatDateTime(opportunity.updatedAt)}
              </dd>
            </div>
          </dl>

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

          {opportunity.sale ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    <Handshake className="h-4 w-4" />
                    Venta {opportunity.sale.saleNumber}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                    Esta oportunidad ya está vinculada a una venta.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SaleStatusBadge status={opportunity.sale.status} />
                  <Link
                    to={`/sales?open=${opportunity.sale.id}`}
                    onClick={onClose}
                    className="text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-200"
                  >
                    Ver venta
                  </Link>
                </div>
              </div>
            </div>
          ) : opportunity.stage === 'GANADA' ? (
            <Alert variant="info" title="Oportunidad ganada sin venta">
              Puedes registrar la venta asociada desde el botón «Registrar venta».{' '}
              {!canManage ? 'Solo su responsable o un administrador puede hacerlo.' : null}
            </Alert>
          ) : null}

          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Target className="h-3.5 w-3.5" />
            {canManage
              ? 'Tienes permiso para gestionar esta oportunidad.'
              : 'Solo lectura: esta oportunidad pertenece a otro responsable.'}
          </p>
        </div>
      )}
    </Modal>
  );
};
