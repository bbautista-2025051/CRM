import { motion } from "framer-motion"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

export const Modal = ({
  open,
  onClose,
  children,
  ...props
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) => {
  return (
    <div
      {...props}
      className={cn(
        "fixed inset-0 z-50 hidden items-center justify-center bg-black/50",
        open ? "block" : "hidden"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative p-6 w-full max-w-2xl bg-white shadow-xl transition-all duration-200 dark:bg-zinc-900",
          open ? "visible" : "hidden"
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-zinc-100 p-1.5 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        >
          <Icon name="x" className="h-4 w-4" size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}