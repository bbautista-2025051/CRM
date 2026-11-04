import type { ReactElement, SVGProps } from 'react';
import { cn } from '@/lib/cn';

export interface NexoIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export type NexoIcon = (props: NexoIconProps) => ReactElement;

const base = (props: NexoIconProps): SVGProps<SVGSVGElement> => ({
  viewBox: '0 0 24 24',
  width: props.size ?? 24,
  height: props.size ?? 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  className: cn('shrink-0', props.className),
});

/** Grid asimétrico editorial — Panel / Dashboard */
export const PanelIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.25" />
    <line x1="10" y1="4.5" x2="10" y2="19.5" />
    <line x1="14" y1="12" x2="21" y2="12" />
  </svg>
);

/** Torre corporativa descentrada — Empresas */
export const CompaniesIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M4 20V9a1.75 1.75 0 0 1 1.75-1.75H11a1.75 1.75 0 0 1 1.75 1.75V20" />
    <path d="M12.75 20v-6h5.5a1.75 1.75 0 0 1 1.75 1.75V20" />
    <line x1="2.5" y1="20" x2="21.5" y2="20" />
    <circle cx="7.8" cy="11.4" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="7.8" cy="15.3" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

/** Persona de trazos suaves — Clientes */
export const ClientsIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="7.5" r="3.4" />
    <path d="M5 20.2c0-4 3.1-6.3 7-6.3s7 2.3 7 6.3" />
  </svg>
);

/** Embudo comercial — Oportunidades */
export const OpportunitiesIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M4 5.5h16L13.5 12v6.25l-3 1.75v-8L4 5.5Z" />
  </svg>
);

/** Etiqueta de trato — Ventas */
export const SalesIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M3.5 13.1 13.4 3.2a2 2 0 0 1 1.4-.6H20a1 1 0 0 1 1 1v5.2a2 2 0 0 1-.6 1.4l-9.9 9.9a2.3 2.3 0 0 1-3.2 0l-3.8-3.8a2.3 2.3 0 0 1 0-3.2Z" />
    <circle cx="16.6" cy="7.4" r="1.15" />
  </svg>
);

/** Carpeta con avances — Proyectos */
export const ProjectsIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M3.75 7.5a2 2 0 0 1 2-2h4l2 2h6.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    <line x1="7.5" y1="12" x2="13.5" y2="12" />
    <line x1="7.5" y1="15.2" x2="12" y2="15.2" />
  </svg>
);

/** Círculos entrelazados — Equipo */
export const TeamIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <circle cx="9.4" cy="12" r="5.6" />
    <circle cx="14.6" cy="12" r="5.6" />
  </svg>
);

/** Credencial — Usuarios / administración */
export const UsersAdminIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.25" />
    <circle cx="8.6" cy="11" r="1.75" />
    <line x1="8.6" y1="15.6" x2="8.6" y2="15.6" />
    <line x1="12.8" y1="9.5" x2="18" y2="9.5" />
    <line x1="12.8" y1="12.2" x2="18" y2="12.2" />
    <line x1="12.8" y1="14.9" x2="15.4" y2="14.9" />
  </svg>
);

/** Pulso vital — Actividad */
export const ActivityIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M3 12.5h4l2.3-5.8 3.6 10.6 2.4-7.3 1.6 2.5H21" />
  </svg>
);

/** Sliders asimétricos — Configuración */
export const SettingsIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <circle cx="15" cy="7" r="1.55" fill="var(--surface, #0d131f)" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="9" cy="12" r="1.55" fill="var(--surface, #0d131f)" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="13.5" cy="17" r="1.55" fill="var(--surface, #0d131f)" />
  </svg>
);

/** Billetera de pulso — Ingresos */
export const WalletIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M4 8.25A2.25 2.25 0 0 1 6.25 6h11.5A2.25 2.25 0 0 1 20 8.25v7.5A2.25 2.25 0 0 1 17.75 18H6.25A2.25 2.25 0 0 1 4 15.75Z" />
    <path d="M14.5 12h5.5v3h-5.5a1.5 1.5 0 0 1 0-3Z" />
  </svg>
);

/** Ascendente comercial — Conversión */
export const ConversionIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M4 17.5 9.5 12l4 4L20 9" />
    <path d="M15 9h5v5" />
  </svg>
);

/** Escudo de confianza — Acceso seguro */
export const ShieldIcon = (props: NexoIconProps) => (
  <svg {...base(props)}>
    <path d="M12 3.25 5 6.1v5.35c0 4.7 2.85 8.3 7 9.3 4.15-1 7-4.6 7-9.3V6.1Z" />
    <path d="M9.5 12.2 11.6 14.3 14.8 10.5" />
  </svg>
);
