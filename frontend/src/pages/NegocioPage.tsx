import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { useConfirm } from "@/providers/ConfirmProvider"
import { useToast } from "@/providers/ToastProvider"
import { usePageTitle } from "@/hooks/usePageTitle"
import { opportunitiesApi, unwrap } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { SaleStatusBadge, Icon } from "@/components/ui/StatusBadges"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate, formatMoney, formatDateTime } from "@/lib/format"

export const NegocioPage = () => {
  usePageTitle("Negocio")
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useSearchParams()
  const opportunityId = id

  const query = useQuery({
    queryKey: ["opportunities", "detail", opportunityId],
    queryFn: async () => unwrap(await opportunitiesApi.get(opportunityId!)),
    enabled: Boolean(opportunityId),
  })

  const opportunity = query.data

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["opportunities"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-300">Cargando oportunidad...</p>
        </div>
      </div>
    )
  }

  const onConfirm = async () => {
    if (!opportunity) return
    const accepted = await confirm({
      title: `Confirmar oportunidad ${opportunity.name}`,
      description: `La oportunidad ${opportunity.name} será confirmada.`,
      confirmLabel: "Confirmar",
    })
    if (accepted) {
      // Lógica para confirmar oportunidad
      success("Oportunidad confirmada", "La oportunidad ha sido marcada como confirmada.")
    }
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <motion.h1
            className="text-3xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-100 bg-clip-text text-transparent tracking-tight mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {opportunity.name}
          </motion.h1>
          <motion.p
            className="text-lg text-zinc-600 dark:text-zinc-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {opportunity.description ?? 'Sin descripción'}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Responsable</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                  {user.name}
                  <Icon name="user" className="h-3.5 w-3.5 shrink-0 text-muted" />
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Valor</dt>
                <dd className="mt-1 text-2xl font-semibold text-ink">
                  {formatMoney(opportunity.value)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Probabilidad</dt>
                <dd className="mt-1 text-sm text-ink">
                  {opp.probability}%
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <Icon
              name="calendar"
              className="w-5 h-5 text-zinc-400 dark:text-zinc-300 mr-2"
              size={16}
            />
            <span className="text-zinc-500 dark:text-zinc-400">Creada {formatDate(opportunity.createdAt)}</span>
          </div>

          <div>
            <Icon
              name="target"
              className="w-5 h-5 text-zinc-400 dark:text-zinc-300 mr-2"
              size={16}
            />
            <span className="text-zinc-500 dark:text-zinc-400">Etapa: {opp.stage ?? 'NEGOCIACION'}</span>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/80">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Descripción detallada</h2>
          <p className="text-zinc-600 dark:text-zinc-400 line-clamp-4">
            {opportunity.description ?? 'No hay descripción disponible'}
          </p>
        </div>
      </div>
    </div>
  )
}