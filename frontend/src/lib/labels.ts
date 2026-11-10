import type {
  ClientStatus,
  CompanyStatus,
  OpportunityStage,
  OpportunityStatus,
  ProjectStatus,
  Role,
  SaleStatus,
  TaskStatus,
  UserStatus,
} from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  VENDEDOR: 'Vendedor',
  PREVENTA: 'Preventa',
  GERENTE: 'Gerente',
  OPERACIONES: 'Operaciones',
  PROGRAMADOR: 'Programador',
  SUPERVISOR: 'Supervisor',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  ACTIVE: 'Activa',
  ARCHIVED: 'Archivada',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
};

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  NEGOCIACION: 'Negociación',
  GANADA: 'Ganada',
  PERDIDA: 'Perdida',
};

export const STAGE_ORDER: OpportunityStage[] = [
  'NEGOCIACION',
  'GANADA',
  'PERDIDA',
];

export const STAGE_TONES: Record<OpportunityStage, string> = {
  NEGOCIACION: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  GANADA: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  PERDIDA: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export const STAGE_BAR_COLORS: Record<OpportunityStage, string> = {
  NEGOCIACION: '#f59e0b',
  GANADA: '#10b981',
  PERDIDA: '#f43f5e',
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  OPEN: 'Abierta',
  WON: 'Ganada',
  LOST: 'Perdida',
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

export const SALE_STATUS_TONES: Record<SaleStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
  CONFIRMED:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  CANCELLED:
    'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Activo',
  COMPLETED: 'Terminado',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
};

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  ARCHIVE: 'Archivado',
  CANCEL: 'Cancelación',
  STAGE_CHANGE: 'Cambio de etapa',
  PASSWORD_CHANGE: 'Cambio de contraseña',
  PASSWORD_RESET: 'Restablecimiento de contraseña',
  AVATAR_UPDATE: 'Foto actualizada',
  AVATAR_DELETE: 'Foto eliminada',
  GOOGLE_LINK: 'Google vinculado',
  GOOGLE_UNLINK: 'Google desvinculado',
  SESSION_REVOKE: 'Sesiones cerradas',
};

export const ENTITY_LABELS: Record<string, string> = {
  COMPANY: 'Empresa',
  CLIENT: 'Cliente',
  OPPORTUNITY: 'Oportunidad',
  SALE: 'Venta',
  PROJECT: 'Proyecto',
  TASK: 'Tarea',
  USER: 'Usuario',
  SESSION: 'Sesión',
};

export const THEME_LABELS = {
  LIGHT: 'Claro',
  DARK: 'Oscuro',
  SYSTEM: 'Sistema',
} as const;
