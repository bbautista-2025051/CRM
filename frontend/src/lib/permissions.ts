import type { Role, SaleStatus } from '@/types';

export const isAdmin = (role: Role | undefined | null): boolean => role === 'ADMIN';

export const canManageUsers = (role: Role | undefined | null): boolean => isAdmin(role);

export const canArchive = (role: Role | undefined | null): boolean => isAdmin(role);

export const canConfirmSales = (role: Role | undefined | null): boolean => isAdmin(role);

export const canManageOpportunity = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
): boolean => isAdmin(role) || (Boolean(userId) && userId === ownerId);

export const canDeleteOpportunity = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
  hasSale: boolean,
): boolean => !hasSale && canManageOpportunity(role, userId, ownerId);

export const canManageSale = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
): boolean => isAdmin(role) || (Boolean(userId) && userId === ownerId);

export const canEditSale = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
  status: SaleStatus,
): boolean => {
  if (status === 'CANCELLED') return false;
  if (isAdmin(role)) return true;
  return canManageSale(role, userId, ownerId) && status === 'PENDING';
};

export const canCancelSale = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
  status: SaleStatus,
): boolean => {
  if (status === 'CANCELLED') return false;
  if (isAdmin(role)) return true;
  return canManageSale(role, userId, ownerId) && status === 'PENDING';
};

/** ADMIN y OPERACIONES pueden crear, asignar y gestionar tareas de equipo. */
export const canManageTeamTasks = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isOperaciones(role);
