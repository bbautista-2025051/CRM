import { Icon } from "@/components/ui/Icon"

export const Alert = ({
  variant,
  title,
  description,
  onClose,
  className,
}: {
  variant?: "success" | "warning" | "error"
  title: string
  description?: string
  onClose?: () => void
  className?: string
}) => {
  const variantStyles = {
    success: {
      bg: "zinc-50/80",
      border: "zinc-200/50",
      text: "zinc-800",
      icon: "check-circle-2",
    },
    warning: {
      bg: "amber-50/80",
      border: "amber-400/50",
      text: "amber-800",
      icon: "alert-circle",
    },
    error: {
      bg: "rose-50/80",
      border: "rose-400/50",
      text: "rose-600",
      icon: "close",
    },
  }

  const style = variantStyles[variant] || variantStyles.warning

  return (
    <div
      className={cn(
        "rounded-xl border",
        style.border,
        "p-5",
        style.bg,
        " backdrop-blur-sm",
        style.text,
        "transition-colors",
        compact ? "py-2.5" : "py-4",
        className
      )}
    >
      <Icon
        name={style.icon}
        className="w-5 h-5 text-{style.text} mb-3"
        size={20}
      />
      <h3 className="font-medium text-{style.text} mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-zinc-400 dark:text-zinc-300 line-clamp-2">
          {description}
        </p>
      )}
      {onClose && (
        <button
          onClick={onClose}
          className="mt-3 inline-flex items-center gap-1 px-2 rounded text-zinc-400 dark:text-zinc-300"
        >
          <span>Entendido</span>
        </button>
      )}
    </div>
  )
}