import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { useConfirm } from "@/providers/ConfirmProvider"
import { useToast } from "@/providers/ToastProvider"
import { usePageTitle } from "@/hooks/usePageTitle"
import { tasksApi, unwrap } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate } from "@/lib/format"
import { Icon } from "@/components/ui/Icon"

export const TaskDetailPage = () => {
  usePageTitle("Detalle de tarea")
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useSearchParams()
  const taskId = id

  const query = useQuery({
    queryKey: ["tasks", "detail", taskId],
    queryFn: async () => unwrap(await tasksApi.get(taskId!)),
    enabled: Boolean(taskId),
  })

  const task = query.data

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-300">Cargando tarea...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-10">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="p-6 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/80"
        >
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            <Icon name="list-checks" className="h-5 w-5 mr-2" size={18} />
            {task.title}
          </h1>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Asignado a</dt>
              <dd className="mt-1 text-sm text-ink">
                {task.assignee?.name ?? 'Sin asignar'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Estado</dt>
              <dd className="mt-1 text-sm text-ink">
                {task.status}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Vencimiento</dt>
              <dd className="mt-1 text-sm text-ink">
                {formatDate(task.dueDate)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-zinc-500 dark:text-zinc-400 line-clamp-3">
            {task.description ?? 'No hay descripción'}
          </p>

          <div className="mt-6 pt-4 border-t border-zinc-200/20 dark:border-zinc-800/20">
            <Button variant="secondary">Completar tarea</Button>
            <Button variant="outline">Cancelar</Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}