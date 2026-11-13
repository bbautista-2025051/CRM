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
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate } from "@/lib/format"
import { Icon } from "@/components/ui/Icon"

export const ClientsPage = () => {
  usePageTitle("Clientes")
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useSearchParams()

  const query = useQuery({
    queryKey: ["clients", "list"],
    queryFn: async () => unwrap(await clientsApi.list()),
    enabled: Boolean(),
  })

  const clients = query.data ?? []

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["clients"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }

  const onCreate = () => {
    navigate("/cliente/nuevo")
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">
          Clientes
          <span className="text-zinc-500 dark:text-zinc-400">
            <Icon name="users" className="h-4 w-4 mr-1" size={18} />
            {clients.length} registrados
          </span>
        </h1>
        <Button onClick={onCreate} variant="secondary">
          <Icon name="plus" className="h-4 w-4 mr-2" size={18} />
          Nuevo cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className="group rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            onClick={() => navigate(`/cliente/${client.id}`)}
          >
            <div className="flex items-start gap-3">
              <Icon
                name="user-round"
                className="w-8 h-8 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center"
                size={20}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {client.firstName} {client.lastName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium tracking-wider">
                  {client.email}
                </p>
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Empresa: {client.company?.name ?? 'Sin empresa'}
              </div>
              <div className="text-right">
                <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Teléfono</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {client.phone ?? 'No registrado'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}