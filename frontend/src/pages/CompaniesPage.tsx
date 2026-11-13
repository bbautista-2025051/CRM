import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { useConfirm } from "@/providers/ConfirmProvider"
import { useToast } from "@/providers/ToastProvider"
import { usePageTitle } from "@/hooks/usePageTitle"
import { companiesApi, unwrap } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { formatDate } from "@/lib/format"
import { Icon } from "@/components/ui/Icon"

export const CompaniesPage = () => {
  usePageTitle("Empresas")
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useSearchParams()

  const query = useQuery({
    queryKey: ["companies", "list"],
    queryFn: async () => unwrap(await companiesApi.list()),
    enabled: Boolean(),
  })

  const companies = query.data ?? []

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["companies"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }

  const onCreate = () => {
    navigate("/empresa/nueva")
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">
          Empresas
          <span className="text-zinc-500 dark:text-zinc-400">
            <Icon name="building-2" className="h-4 w-4 mr-1" size={18} />
            {companies.length} registradas
          </span>
        </h1>
        <Button onClick={onCreate} variant="secondary">
          <Icon name="plus" className="h-4 w-4 mr-2" size={18} />
          Nueva empresa
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {companies.map((company) => (
          <div
            key={company.id}
            className="group rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            onClick={() => navigate(`/companies/${company.id}`)}
          >
            <div className="flex items-start gap-3">
              <Icon
                name="building-2"
                className="w-8 h-8 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center"
                size={20}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {company.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium tracking-wider">
                  {company.legalName ?? 'Sin nombre legal'}
                </p>
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sector</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {company.sector ?? 'Sin sector'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Fundada</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {company.establishedDate ? formatDate(company.establishedDate) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}