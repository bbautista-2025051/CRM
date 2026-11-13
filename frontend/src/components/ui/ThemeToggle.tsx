import { Icon } from "@/components/ui/Icon"

export const ThemeToggle = () => {
  const { themePreference, setThemePreference } = useThemePreference()

  return (
    <button
      onClick={() => setThemePreference((prev) => (prev === "DARK" ? "LIGHT" : "DARK"))}
      className="rounded-full p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      aria-label="Cambiar tema"
    >
      <Icon
        name={themePreference === "DARK" ? "sun" : "moon"}
        className="h-4 w-4"
        size={18}
      />
    </button>
  )
}

function useThemePreference() {
  const [themePreference, setThemePreference] = React.useState<
    "LIGHT" | "DARK" | "SYSTEM"
  >("SYSTEM")

  React.useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const stored = localStorage.getItem("theme")
    if (stored) {
      setThemePreference(stored as "LIGHT" | "DARK" | "SYSTEM")
    } else if (prefersDark) {
      setThemePreference("DARK")
    } else {
      setThemePreference("LIGHT")
    }
  }, [])

  React.useEffect(() => {
    const root = window.document.documentElement
    const setTheme = (theme: "LIGHT" | "DARK" | "SYSTEM") => {
      root.classList.remove("light", "dark")
      if (theme === "DARK") root.classList.add("dark")
      else if (theme !== "SYSTEM") root.classList.add("light")
      localStorage.setItem("theme", theme)
    }
    setTheme(themePreference)
  }, [themePreference])

  return { themePreference, setThemePreference }
}