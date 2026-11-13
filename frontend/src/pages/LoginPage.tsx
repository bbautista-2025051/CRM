import { Icon } from "@/components/ui/Icon"

export const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <Icon
            name="shield-check"
            className="w-12 h-12 text-zinc-400 dark:text-zinc-300 mb-4"
            size={36}
          />
          <h2 className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">Bienvenido/a</h2>
          <p className="text-zinc-500 dark:text-zinc-300">
            Inicia sesión para continuar
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Icon
              name="user"
              className="w-5 h-5 inline-block mr-2 text-zinc-400 dark:text-zinc-300"
              size={18}
            /> correo electrónico
            <input
              type="email"
              placeholder="usuario@empresa.com"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              aria-label="Correo electrónico"
            />
          </div>

          <div>
            <Icon
              name="lock-2"
              className="w-5 h-5 inline-block mr-2 text-zinc-400 dark:text-zinc-300"
              size={18}
            /> contraseña
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              aria-label="Contraseña"
            />
          </div>
        </div>

        <div>
          <Button
            type="submit"
            className="w-full py-3 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Icon name="log-out" className="h-4 w-4 mr-2" size={16} /> Ingresar
          </Button>
        </div>

        <div className="text-sm text-zinc-500 dark:text-zinc-300">
          ¿No tienes cuenta?
          <a href="/auth/register" className="font-semibold underline hover:text-brand-strong dark:hover:text-brand">
            Regístrate aquí
          </a>
        </div>
      </div>
    </div>
  )
}