import type React from "react"

// Conjunto de íconos personalizados basados en el diseño del MenuBar
// Estilo: trazos consistentes, esquinas redondeadas, diseño coherente

// Interfaz para definición de íconos
type IconPathProps = {
  data: string
  className?: string
  strokeWidth?: number
  size?: number
}

const customIcons: Record<string, { data: string }> = {}

// Helper para crear un ícono
const createIcon = (name: string, pathData: string) => {
  customIcons[name] = { data: pathData }
  return customIcons[name]
}

// ===== Íconos del Menú Principal (del MenuBar mostrado) =====

createIcon("message-circle", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><path d="M2.61 12a10 10 0 1 1 19.63 3.55"/><path d="M12 2v2l2 4" /></svg>`)

createIcon("mail", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M3 9l9-7h9a5 5 0 0 1 5 5v3h5v-3a5 5 0 0 1-5-5H6a5 5 0 0 1-5-5V6z"/><rect x="5" y="9" width="15" height="10" rx="2" ry="2" /></svg>`)

createIcon("search", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3" /></svg>`)

createIcon("grid", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="10" height="10" rx="1" ry="1"/><rect x="11" y="11" width="6" height="6" /></svg>`)

createIcon("layout", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 3v18"/><path d="M15 9h4"/><path d="M9 15h6"/></svg>`)

createIcon("users", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21l-3-3v-3a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4v3"/><circle cx="4" cy="4" r="3"/></svg>`)

createIcon("settings", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.65 1.65 0 0 0 18 10.65"/><letopts>
</svg>`)

createIcon("alert-circle", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="m12 16 4-3.61"/><path d="M12 8V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v4"/></svg>`)

createIcon("check", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M20 6L9 17l-5-5"/></svg>`)

createIcon("close", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`)

createIcon("arrow-left", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><line x1="15" y1="12" x2="3" y2="12"/><polyline points="3 12 12 3 21 12"/></svg>`)

createIcon("arrow-right", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><line x1="9" y1="12" x2="15" y2="12"/><polyline points="9 12 15 12 9 12"/></svg>`)

createIcon("download", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`)

createIcon("upload", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><polyline points="16 14 8 14 12 22"/><polyline points="21 15 16 15 12 9"/></svg>`)

createIcon("edit", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3l-1.915 1.915a2.121 2.121 0 0 1-3 0L2"/><path d="M3 18.5a2.121 2.121 0 0 1 3 3l.586.586a2.121 2.121 0 0 1-3 0L3"/><path d="M9 18.5a2.121 2.121 0 0 1 3 3l.586.586a2.121 2.121 0 0 1-3 0L9"/><path d="M18.5 9a2.121 2.121 0 0 1 3 3l-.586.586a2.121 2.121 0 0 1-3 0L18.5"/><path d="M9 6a2.121 2.121 0 0 1 3 3l-.586.586a2.121 2.121 0 0 1-3 0L9"/></svg>`)

createIcon("trash", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M3 6h18"/></svg>`)

createIcon("calendar", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y1="10"/></svg>`)

createIcon("clock", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`)

createIcon("plus", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><line x1="12" y1="1" x2="12" y2="23"/><line x1="1" y1="12" x2="23" y2="12"/></svg>`)

createIcon("minus", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><line x1="3" y1="12" x2="21" y2="12"/></svg>`)

createIcon("heart", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M18.54 5.8h1.3a2 2 0 0 1 1.9 1.8 2.1 2.1 0 0 1-.5 1.8 2.5 2.5 0 0 1-.8.3 2.9 2.9 0 0 1-1.6.2 2.4 2.4 0 0 1-.7.2m-9.26 4h1.3a2 2 0 0 1 1.9 1.8 2.1 2.1 0 0 1-.5 1.8 2.5 2.5 0 0 1-.8.3 2.9 2.9 0 0 1-1.6.2 2.4 2.4 0 0 1-.7.2m9.26-4h1.3a2 2 0 0 1 1.9 1.8 2.1 2.1 0 0 1-.5 1.8 2.5 2.5 0 0 1-.8.3 2.9 2.9 0 0 1-1.6.2 2.4 2.4 0 0 1-.7.2"/></svg>`)

createIcon("star", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 6.18 21.02 7.32 14.14 2.34 9.27 8.95 8.26 12 2"/></svg>`)

createIcon("eye", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><path d="M23 12a10 10 0 0 1-10 10"/><path d="M13 12a10 10 0 0 1-10-10"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>`)

createIcon("eye-off", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20.54"/><path d="M12 4v16c0 2-3 3-3 3h-4c-3 0-3-3-3-3V7c0-2 1-3 3-3h4c2 0 3 1 3 3z"/><path d="M9 13c0 .5.2 1 .5 1h4c.5 0 .7-.2.9-1"/><path d="M9 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16"/></svg>`)

createIcon("link", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M10 13l4 4L2 12l10-10z"/><path d="M2 12s7-6 12-6s7 6 12 6"/><path d="M2 12V2c2.73 0 5.08 1 7.06 3L22 7"/></svg>`)

createIcon("unlink", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M10 13l4 4"/><path d="M2 12s7-6 12-6s7 6 12 6"/><path d="M2 12v2c2 0 4.5 1 6.5 3"/><path d="M2 20v-2c2 0 4.5-1 6.5-3"/></svg>`)

createIcon("log-out", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M9 18c1.664 0 3-1.336 3-3H3c0 1.108.54 2.107 1.5 3L9 18z"/><path d="M3.27 6.96L12 12.01"/><path d="M20.73 6.96L12 12.01"/></svg>`)

// Exportar función para usar íconos
export const Icon = ({ 
  name, 
  size = 18, 
  className,
  strokeWidth = 1.5 
}: { 
  name: keyof typeof customIcons 
  size?: number 
  className?: string 
  strokeWidth?: number 
}) => {
  const iconData = customIcons[name]
  if (!iconData) {
    // Fallback: círculo vacío
    return <svg width={size} height={size} className={className} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={strokeWidth}/></svg>
  }
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      className={className}
      aria-hidden="true"
    >
      <path 
        data={iconData.data} 
        stroke="currentColor" 
        strokeWidth={strokeWidth} 
        fill="none" 
        className={className}
      />
    </svg>
  )
}

// Exportar tipos útiles
export type { IconPathProps }

// Exportar el objeto de íconos para acceso directo
export { customIcons }