import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { useConfirm } from "@/providers/ConfirmProvider"
import { useToast } from "@/providers/ToastProvider"
import { usePageTitle } from "@/hooks/usePageTitle"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"

export const SettingsPage = () => {
  usePageTitle("Configuración")
  const { user } = useAuth()
  const [passwordNoticeVisible, setPasswordNoticeVisible] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.mustChangePassword) return
    const timer = setTimeout(() => setPasswordNoticeVisible(false), 10_000)
    return () => clearTimeout(timer)
  }, [user?.mustChangePassword])

  if (!user) return null

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-10">
      <div className="max-w-lg mx-auto">
        {passwordNoticeVisible && (
          <Alert
            variant="warning"
            title="Debes cambiar tu contraseña"
            className="py-2.5"
            onClose={() => setPasswordNoticeVisible(false)}
          >
            Estás usando una contraseña temporal. Actualízala desde
            <a href="/settings?tab=security" className="font-semibold underline">
              Seguridad
            </a>.
          </Alert>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            <Icon name="settings" className="h-5 w-5 mr-2" size={18} />
            Configuración de cuenta
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-zinc-600 dark:text-zinc-400">Información personal</h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                {user.name} - {user.email}
              </p>
            </div>

            <div>
              <h3 className="font-medium text-zinc-600 dark:text-zinc-400">Seguridad</h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                Último inicio sesión: hace {new Date().getTime() - user.lastLoginAt} ms
              </p>
            </div>

            <div>
              <h3 className="font-medium text-zinc-600 dark:text-zinc-400">Privacidad</h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                Tus datos están protegidos con cifrado de extremo a extremo.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200/20 dark:border-zinc-800/20">
            <Button
              variant="danger"
              onClick={() => navigate("/auth/login?logout=true")}
              className="w-full py-3 rounded-xl text-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Icon name="log-out" className="h-4 w-4 mr-2" size={16} /> Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}