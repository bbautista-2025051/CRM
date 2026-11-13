import { Icon } from "@/components/ui/Icon"

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userData: {
    name: string
    email: string
    role: string
  }) => void
}

export const UserFormModal = ({ isOpen, onClose, onSubmit }: UserFormModalProps) => {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("vendedor")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-zinc-100 p-1.5 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        >
          <Icon name="x" className="h-4 w-4" size={18} />
        </button>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
          <Icon name="user-plus" className="h-4 w-4 mr-2" size={18} /> Agregar usuario
        </h2>

        <form
          onSubmit={e => {
            e.preventDefault()
            onSubmit({ name, email, role })
            onClose()
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              aria-label="Nombre completo"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              aria-label="Correo electrónico"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Rol
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              aria-label="Rol"
            >
              <option value="vendedor">Vendedor</option>
              <option value="preventa">Preventa</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="py-2 px-4 rounded-md text-zinc-600 dark:text-zinc-400 bg-zinc-600 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors">
              <Icon name="check" className="h-4 w-4 mr-2" size={16} /> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}