import { Icon } from "@/components/ui/Icon"

type ChartType = "pie" | "bar" | "line"

interface ChartProps {
  type: ChartType
  data: number[]
  labels: string[]
  onSelect?: (label: string) => void
}

export const DashboardCharts = ({ type, data, labels, onSelect }: ChartProps) => {
  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  return (
    <div className="space-y-6">
      {type === "pie" && (
        <div>
          <h3 className="text-zinc-500 dark:text-zinc-400 mb-4">Distribución</h3>
          <div className="grid grid-cols-2 gap-2">
            {labels.map((label, index) => (
              <div
                key={label}
                className={`p-2 rounded-md ${selectedIndex === index ? "bg-zinc-300 dark:bg-zinc-700" : "text-zinc-400 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"}`}
                onClick={() => {
                  setSelectedIndex(index)
                  onSelect?.call(this, label)
                }}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto">
                  <Icon
                    name="circle"
                    className={`bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-900`}
                    size={16}
                  />
                </div>
                <span className="text-xs capitalize">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === "bar" && (
        <div>
          <h3 className="text-zinc-500 dark:text-zinc-400 mb-4">Ventas por mes</h3>
          <div className="space-y-2">
            {labels.map((label, index) => (
              <div key={label} className="flex items-baseline justify-between">
                <span className="text-zinc-400 dark:text-zinc-300 text-xs capitalize">{label}</span>
                <div
                  className={`h-4 rounded-md ${selectedIndex === index ? "bg-zinc-400" : "bg-zinc-200/50"} dark:bg-zinc-800/50 transition-colors w-${data[index] > 0 ? data[index] * 2 : 4}px`}
                  style={{ height: `${data[index] * 4}px` }}
                ></div>
                <span className="text-zinc-400 dark:text-zinc-300 text-xs">${data[index]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === "line" && (
        <div>
          <h3 className="text-zinc-500 dark:text-zinc-400 mb-4">Tendencia</h3>
          <div className="h-8 rounded-md overflow-hidden bg-gradient-to-r from-zinc-300 dark:bg-zinc-700 to-zinc-400">
            {data.map((value, index) => {
              const height = Math.max(16, value * 2)
              const x = (index / (data.length - 1)) * 200
              return (
                <div
                  key={index}
                  className={`absolute bottom-0 left-[${x}px] w-px h-[${height}px] bg-zinc-400 dark:bg-zinc-600`}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}