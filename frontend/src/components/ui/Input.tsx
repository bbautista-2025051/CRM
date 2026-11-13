import type React from "react"
import { Icon } from "@/components/ui/Icon"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: keyof typeof import("@/components/ui/Icon").customIcons
  endIcon?: keyof typeof import("@/components/ui/Icon").customIcons
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export const Input = ({
  icon,
  endIcon,
  prefix,
  suffix,
  ...props
}: InputProps) => {
  const [focused, setFocused] = React.useState(false)

  return (
    <div className="relative group">
      {prefix && <div className="absolute left-0 inset-y-1/2 start-0 flex items-center pointer-events-none px-1">{prefix}</div>}

      {icon && (
        <Icon
          name={icon}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none w-4 h-4"
          size={18}
        />
      )}

      <input
        {...props}
        className="block w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 transition-colors"
        aria-label={props["aria-label"]}
      />

      {endIcon && (
        <Icon
          name={endIcon}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none w-4 h-4"
          size={18}
        />
      )}

      {focused && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-px h-6 bg-zinc-300 dark:bg-zinc-600">
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-zinc-300 dark:bg-zinc-600" />
        </div>
      )}
    </div>
  )
}