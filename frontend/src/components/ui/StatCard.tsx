import type React from "react"
import { Icon } from "@/components/ui/Icon"

export interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changePositive?: boolean
  icon?: keyof typeof import("@/components/ui/Icon").customIcons
}

export const StatCard = ({
  title,
  value,
  change,
  changePositive = true,
  icon,
}: StatCardProps) => {
  const changeClass = changePositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400"
  const changeArrow = changePositive ? "↗" : "↘"

  return (
    <div className="p-4 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/80">
      <div className="flex items-start justify-between">
        <div>
          <Icon
            name={icon}
            className="w-5 h-5 text-zinc-400 dark:text-zinc-300 mb-1"
            size={18}
          />{/* fallback rendering */}
          <span className="text-zinc-500 dark:text-zinc-400">{title}</span>
        </div>

        <div className="text-right">
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {change !== undefined && (
            <div className={changeClass}>
              <span className="text-[10px]">
                {changeArrow}{" "}
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}