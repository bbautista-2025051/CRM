import type React from "react"
import { Icon } from "@/components/ui/Icon"

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  ...props
}: PaginationProps) => {
  const pages: number[] = []
  const totalPagesNum = totalPages || 1

  // Calculate page range
  const siblingCount = 1
  const totalLeft = siblingCount + 1
  const totalRight = siblingCount + 1

  for (let i = 1; i <= totalPagesNum; i++) {
    pages.push(i)
  }

  return (
    <nav aria-label="Page navigation" className="flex items-center gap-2">
      {currentPage > 1 && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-l-md px-3 py-1 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Página anterior"
        >
          <Icon
            name="chevron-left"
            className="h-4 w-4"
            size={18}
          />
        </button>
      )}

      {pages.map((page) => {
        const isCurrent = page === currentPage
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "rounded-md px-3 py-1 border border-zinc-300 dark:border-zinc-700",
              isCurrent
                ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-950 dark:text-zinc-950"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            {page}
          </button>
        )
      })}

      {currentPage < totalPages && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-r-md px-3 py-1 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Página siguiente"
        >
          <Icon
            name="chevron-right"
            className="h-4 w-4"
            size={18}
          />
        </button>
      )}
    </nav>
  )
}