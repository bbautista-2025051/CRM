import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { useToast } from "@/providers/ToastProvider"
import { usePageTitle } from "@/hooks/usePageTitle"
import { activityApi, unwrap } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"

export const ActivityPage = () => {
  usePageTitle("Actividad")
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["activity", "list"],
    queryFn: async () => unwrap(await activityApi.list()),
    enabled: Boolean(),
  })

  const activityLogs = query.data ?? []

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["activity"] })
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">
            Historial de actividad
            <span className="text-zinc-500 dark:text-zinc-400">
              <Icon name="clock" className="h-4 w-4 mr-1" size={18} />
              {activityLogs.length} eventos
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="group rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon
                  name="calendar"
                  className="w-8 h-8 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center flex-shrink-0"
                  size={20}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {log.action}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium tracking-s tighter">
                    {log.entityType}
                  </p>
                </div>
              </div>

              <div className="mt-2 text-right text-zinc-400 dark:text-zinc-300 text-xs">
                <span>{formatDate(log.createdAt)}</span>
                <span className="mx-2">|</span>
                <span>{log.user?.name ?? 'Sistema'}</span>
              </div>
            </div>
          ))}
        </div>

        {activityLogs.length === 0 && (
          <div className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
            <Icon name="calendar" className="w-12 h-12 mx-auto mb-3" size={30} />
            No hay actividad registrada
          </div>
        )}
      </div>
    </div>
  )
}