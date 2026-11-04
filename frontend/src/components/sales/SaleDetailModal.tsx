import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  Handshake,
  Pencil,
  Target,
  UserRound,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { SaleStatusBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { salesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import {
  canCancelSale,
  canConfirmSales,
  canEditSale,
} from '@/lib/permissions';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import type { Sale } from '@/types';

export const SaleDetailModal = ({
  saleId,
  onClose,
  onEdit,
}: {
  saleId: string | null;
  onClose: () => void;
  onEdit: (sale: Sale) => void;
}) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sales', 'detail', saleId],
    queryFn: async () => unwrap(await salesApi.get(saleId!)),
    enabled: Boolean(saleId),
  });

  const sale = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['companies'] });
    void queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const confirmSale = useMutation({
    mutationFn: () => salesApi.confirm(saleId!),
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
    mutationFn: () => salesApi.cancel(saleId!),
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

  const onConfirm = async () => {
    if (!sale) return;
    const accepted = await confirm({
      title: `Confirmar la venta ${sale.saleNumber}`,
      description: `${formatMoney(sale.amount, sale.currency)} pasará a contar como ingreso confirmado. Después solo un administrador podrá modificarla.`,
      confirmLabel: 'Confirmar venta',
    });
    if (accepted) confirmSale.mutate();
  };

  const onCancel = async () => {
    if (!sale) return;
    const accepted = await confirm({
      title: `Cancelar la venta ${sale.saleNumber}`,
      description:
        'La venta se conservará en el histórico con estado cancelada. Esta acción no se puede revertir.',
      confirmLabel: 'Cancelar venta',
      cancelLabel: 'Volver',
      variant: 'danger',
    });
    if (accepted) cancelSale.mutate();
  };

  const canEdit = sale
    ? canEditSale(user?.role, user?.id, sale.ownerId, sale.status)
    : false;
  const canCancel = sale
    ? canCancelSale(user?.role, user?.id, sale.ownerId, sale.status)
    : false;
  const canConfirm =
    sale?.status === 'PENDING' && canConfirmSales(user?.role);
  const pending = confirmSale.isPending || cancelSale.isPending;

  return (
    <Modal
      open={Boolean(saleId)}
      onClose={onClose}
      size="lg"
      fullWindow
      title={
        <span className="flex flex-wrap items-center gap-2">
          Venta {sale?.saleNumber ?? ''}
          {sale ? <SaleStatusBadge status={sale.status} /> : null}
        </span>
      }
      description={
        sale
          ? `${sale.client ? `${sale.client.firstName} ${sale.client.lastName}` : 'Sin cliente'} · ${sale.company?.name ?? 'Sin empresa'}`
          : 'Detalle de la venta'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cerrar
          </Button>
          {sale && canCancel ? (
            <Button
              variant="danger"
              onClick={() => void onCancel()}
              loading={cancelSale.isPending}
              disabled={pending}
              leftIcon={<Ban className="h-4 w-4" />}
            >
              Cancelar venta
            </Button>
          ) : null}
          {sale && canConfirm ? (
            <Button
              variant="success"
              onClick={() => void onConfirm()}
              loading={confirmSale.isPending}
              disabled={pending}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Confirmar
            </Button>
          ) : null}
          {sale && canEdit ? (
            <Button
              onClick={() => onEdit(sale)}
              disabled={pending}
              leftIcon={<Pencil className="h-4 w-4" />}
            >
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
      ) : query.isError || !sale ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <div className="mx-auto max-w-4xl space-y-5">
          {sale.status === 'CONFIRMED' ? (
            <Alert variant="success" title="Venta confirmada">
              Este importe se incluye en los ingresos confirmados. Solo un administrador
              puede modificarla o cancelarla.
            </Alert>
          ) : sale.status === 'CANCELLED' ? (
            <Alert variant="warning" title="Venta cancelada">
              La venta se conserva para auditoría, pero no suma a los ingresos.
            </Alert>
          ) : canConfirm ? (
            <Alert variant="info" title="Venta pendiente de confirmación">
              Revísala y confírmala cuando el cobro esté validado.
            </Alert>
          ) : (
            <Alert variant="info" title="Pendiente de confirmación">
              Un administrador debe confirmar esta venta para que cuente como ingreso.
            </Alert>
          )}

          <div className="border-y border-line py-3.5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Importe
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                  {formatMoney(sale.amount, sale.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Moneda
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">{sale.currency}</p>
              </div>
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Fecha de venta
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <CalendarDays className="h-3.5 w-3.5 text-muted" />
                {formatDate(sale.saleDate)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Responsable
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                {sale.owner ? (
                  <>
                    <Avatar name={sale.owner.name} src={sale.owner.avatarUrl} size="xs" />
                    {sale.owner.name}
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
                {sale.client ? (
                  <Link
                    to={`/clients/${sale.client.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {sale.client.firstName} {sale.client.lastName}
                  </Link>
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
                {sale.company ? (
                  <Link
                    to={`/companies/${sale.company.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {sale.company.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Oportunidad
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <Target className="h-3.5 w-3.5 text-muted" />
                {sale.opportunity ? (
                  <Link
                    to={`/opportunities?open=${sale.opportunity.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {sale.opportunity.name}
                  </Link>
                ) : (
                  <span className="text-muted">Venta manual sin oportunidad</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Registrada
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDateTime(sale.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Última actualización
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDateTime(sale.updatedAt)}</dd>
            </div>
          </dl>

          {sale.notes ? (
            <div className="border-t border-line pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Observaciones
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">
                {sale.notes}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <Handshake className="h-3.5 w-3.5" />
              {canEdit
                ? 'Puedes actualizar los datos de esta venta.'
                : sale.status === 'CANCELLED'
                  ? 'Una venta cancelada no puede modificarse.'
                  : 'Solo lectura: esta venta no admite cambios con tu rol actual.'}
            </p>
            {sale.opportunity ? (
              <Link
                to={`/opportunities?open=${sale.opportunity.id}`}
                className={buttonStyles({ variant: 'link', size: 'xs' })}
              >
                Ver oportunidad
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
};
