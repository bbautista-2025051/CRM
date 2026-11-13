import { Icon } from "@/components/ui/Icon"

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col pt-12">
      <Icon
        name="compass"
        className="w-24 h-24 text-zinc-300 dark:text-zinc-700 mb-4"
        size={48}
      />
      <h2 className="text-2xl font-bold text-zinc-600 dark:text-zinc-400 mb-2">
        Página no encontrada
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Lo sentimos, la página que buscas no existe o ha sido movida.
      </p>
      <Button
        onClick={() => window.history.back()}
        className="px-6 py-3 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Icon name="arrow-left" className="h-4 w-4 mr-2" size={16} /> Volver atrás
      </Button>
    </div>
  )
}