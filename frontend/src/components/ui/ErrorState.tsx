import { Icon } from "@/components/ui/Icon"

export const ErrorState = ({
  error,
  onRetry,
  compact = false,
}: {
  error: unknown
  onRetry?: () => void
  compact?: boolean
}) => {
  const errorMessage =
    error instanceof Error ? error.message : "Error desconocido"

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 p-6 bg-zinc-50 dark:bg-zinc-900/80",
        compact ? "py-4" : "py-6"
      )}
    >
      <Icon
        name="alert-circle"
        className="w-8 h-8 text-zinc-400 dark:text-zinc-300 mx-auto mb-4"
        size={24}
      />
      <h3 className="text-xl font-bold text-zinc-600 dark:text-zinc-400 mb-2">
        Ocurrió un error
      </h3>
      <p className="text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-3">
        {errorMessage}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Icon name="refresh-cw" className="h-4 w-4" size={16} /> Reintentar
        </button>
      )}
    </div>
  )
}