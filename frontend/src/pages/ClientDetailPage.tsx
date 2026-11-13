import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { useConfirm } from "@/providers/ConfirmProvider"
import { useToast } from "@/providers/ToastProvider"
import { usePageTitle } from "@/hooks/usePageTitle"
import { clientsApi, unwrap } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate, formatMoney } from "@/lib/format"
import { Icon } from "@/components/ui/Icon"

export const ClientDetailPage = () => {
  usePageTitle("Detalle de cliente")
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useSearchParams()
  const clientId = id

  const query = useQuery({
    queryKey: ["clients", "detail", clientId],
    queryFn: async () => unwrap(await clientsApi.get(clientId!)),
    enabled: Boolean(clientId),
  })

  const client = query.data

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["clients"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-300">Cargando cliente...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <motion.h1
            className="text-2xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-100 bg-clip-text text-transparent tracking-tight mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {client.firstName} {client.lastName}
          </motion.h1>
          <motion.p
            className="text-lg text-zinc-600 dark:text-zinc-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {client.email}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Nombre</dt>
                <dd className="mt-1 text-sm text-ink">
                  {client.firstName} {client.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Email</dt>
                <dd className="mt-1 text-sm text-ink">
                  {client.email}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Teléfono</dt>
                <dd className="mt-1 text-sm text-ink">
                  {client.phone ?? 'No registrado'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <Icon
              name="calendar"
              className="w-4 h-4 text-zinc-400 dark:text-zinc-300 mr-2"
              size={14}
            />
            <span className="text-zinc-500 dark:text-zinc-400">Creado {formatDate(client.createdAt)}</span>
          </div>

          <div>
            <Icon
              name="building-2"
              className="w-4 h-4 text-zinc-400 dark:text-zinc-300 mr-2"
              size={14}
            />
            <span className="text-zinc-500 dark:text-zinc-400">Empresa: {client.company?.name ?? 'Sin empresa'}</span>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/80">
          <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-3">Información adicional</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            {client.notes ?? 'No hay notas adicionales'}
          </p>
        </div>
      </div>
    </div>
  )
}