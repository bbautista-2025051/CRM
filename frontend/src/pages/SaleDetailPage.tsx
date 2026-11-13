import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Icon } from "@/components/ui/Icon"
import { useAuth } from "@/providers/AuthProvider"
import { useConfirm } from "@/providers/ConfirmProvider"
import { useToast } from "@/providers/ToastProvider"
import { usePageTitle } from "@/hooks/usePageTitle"
import { salesApi, unwrap } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { SaleDetailModal } from "@/components/sales/SaleDetailModal"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate, formatMoney, formatDateTime } from "@/lib/format"

export const SaleDetailPage = () => {
  usePageTitle("Detalle de venta")
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useSearchParams()
  const saleId = id

  const query = useQuery({
    queryKey: ["sales", "detail", saleId],
    queryFn: async () => unwrap(await salesApi.get(saleId!)),
    enabled: Boolean(saleId),
  })

  const sale = query.data

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["sales"] })
    void queryClient.invalidateQueries({ queryKey: ["opportunities"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    void queryClient.invalidateQueries({ queryKey: ["companies"] })
    void queryClient.invalidateQueries({ queryKey: ["clients"] })
  }

  const confirmSale = useMutation({
    mutationFn: () => salesApi.confirm(saleId!),
    onSuccess: () => {
      success("Venta confirmada", "La venta ya suma a los ingresos confirmados.")
      invalidate()
      void query.refetch()
    },
    onError: (error) => {
      toastError(
        "No se pudo confirmar",
        error instanceof ApiError ? error.message : "Inténtalo de nuevo."
      )
    },
  })

  const cancelSale = useMutation({
    mutationFn: () => salesApi.cancel(saleId!),
    onSuccess: () => {
      success("Venta cancelada", "La venta se ha cancelado.")
      invalidate()
      void query.refetch()
    },
    onError: (error) => {
      toastError(
        "No se pudo cancelar",
        error instanceof ApiError ? error.message : "Inténtalo de nuevo."
      )
    },
  })

  const onConfirm = async () => {
    if (!sale) return
    const accepted = await confirm({
      title: `Confirmar la venta ${sale.saleNumber}`,
      description: `${formatMoney(sale.amount, sale.currency)} pasará a contar como ingreso confirmado. Después solo un administrador podrá modificarla.`,
      confirmLabel: "Confirmar venta",
    })
    if (accepted) confirmSale.mutate()
  }

  const onCancel = async () => {
    if (!sale) return
    const accepted = await confirm({
      title: `Cancelar la venta ${sale.saleNumber}`,
      description:
        "La venta se conservará en el histórico con estado cancelada. Esta acción no se puede revertir.",
      confirmLabel: "Confirmar venta",
      cancelLabel: "Volver",
      variant: "danger",
    })
    if (accepted) cancelSale.mutate()
  }

  const canEdit = sale
    ? sale.ownerId === user?.id || user?.role === "ADMIN"
    : false
  const canCancel = sale
    ? sale.ownerId === user?.id || user?.role === "ADMIN"
    : false
  const canConfirm = sale?.status === "PENDING"
  const pending = confirmSale.isPending || cancelSale.isPending

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]">
            Venta {sale?.saleNumber ?? ""}
            {sale ? <span className="text-zinc-500 dark:text-zinc-400">
              <Icon name="check-circle-2" className="h-4 w-4 mr-1" size={18} />
              {sale.status}
            </span> : null}
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {sale
              ? sale.client
                ? `${sale.client.firstName} ${sale.client.lastName} · ${sale.company?.name ?? 'Sin empresa'}`
                : `Sin cliente · ${sale.company?.name ?? 'Sin empresa'}`
              : 'Detalle de la venta'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <Icon name="arrow-left" className="h-4 w-4" /> Volver
          </Button>
          {sale && canCancel ? (
            <Button
              variant="danger"
              onClick={() => void onCancel()}
              loading={cancelSale.isPending}
              disabled={pending}
              leftIcon={<Icon name="ban" className="h-4 w-4" />}
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
              leftIcon={<Icon name="check-circle-2" className="h-4 w-4" />}
            >
              Confirmar
            </Button>
          ) : null}
          {sale && canEdit ? (
            <Button
              onClick={() => navigate(`/negocio/venta/${sale.id}/editar`)}
              disabled={pending}
              leftIcon={<Icon name="pencil" className="h-4 w-4" />}
            >
              Editar
            </Button>
          ) : null}
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError || !sale ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <SaleDetailModal
          saleId={saleId ?? ''}
          onClose={() => {}}
          onEdit={(sale) => navigate(`/negocio/venta/${sale.id}/editar`)}
        />
      )}
    </div>
  )
}