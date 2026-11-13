import type React from "react"
import { Icon } from "@/components/ui/Icon"

export interface SearchInputProps extends React.TextInputHTMLAttributes<HTMLInputElement> {
  placeholder?: string
  onSearch?: (query: string) => void
  disabled?: boolean
}

export const SearchInput = ({
  placeholder = "Buscar...",
  onSearch,
  disabled,
  ...props
}: SearchInputProps) => {
  const [query, setQuery] = React.useState("")
  const [searching, setSearching] = React.useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (onSearch) {
      setSearching(true)
      setTimeout(() => {
        onSearch(value)
        setSearching(false)
      }, 300)
    }
  }

  return (
    <div className="relative group w-full">
      <Icon
        name="search"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none w-4 h-4"
        size={18}
      />
      <input
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        disabled={disabled}
        className="block w-full px-10 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 transition-colors"
        aria-label="Buscar"
      />
      {searching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-px h-6 bg-zinc-300 dark:bg-zinc-600">
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-zinc-300 dark:bg-zinc-600" />
        </div>
      )}
      <Icon
        name="x"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none w-4 h-4"
        size={18}
        onClick={() => {
          setQuery("")
          setFocused(false)
        }}
      />
    </div>
  )
}