import type React from "react"
import { Icon } from "@/components/ui/Icon"

export interface EmptyStateProps {
  icon?: keyof typeof import("@/components/ui/Icon").customIcons
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <div className="text-center py-12">
      {icon && (
        <Icon
          name={icon}
          className="mx-auto mb-4 w-12 h-12 text-zinc-300 dark:text-zinc-700"
          size={30}
        />
      )}

      <h3 className="text-xl font-bold text-zinc-600 dark:text-zinc-400 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}