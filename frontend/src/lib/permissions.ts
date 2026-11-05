export const isAdmin = (role: Role | undefined | null): boolean => role === 'ADMIN';

export const isGerente = (role: Role | undefined | null): boolean => role === 'GERENTE';

export const isPreventa = (role: Role | undefined | null): boolean => role === 'PREVENTA';

export const isSupervisor = (role: Role | undefined | null): boolean => role === 'SUPERVISOR';

export const isProgramador = (role: Role | undefined | null): boolean => role === 'PROGRAMADOR';

export const isOperaciones = (role: Role | undefined | null): boolean => role === 'OPERACIONES';

export const canManageUsers = (role: Role | undefined | null): boolean => isAdmin(role);

export const canArchive = (role: Role | undefined | null): boolean => isAdmin(role);

export const canConfirmSales = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role);

export const canManageOpportunity = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
): boolean => isAdmin(role) || isGerente(role) || (Boolean(userId) && userId === ownerId);

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
): boolean => isAdmin(role) || isGerente(role) || (Boolean(userId) && userId === ownerId);

export const canEditSale = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
  status: SaleStatus,
): boolean => {
  if (status === 'CANCELLED') return false;
  if (isAdmin(role) || isGerente(role)) return true;
  return canManageSale(role, userId, ownerId) && status === 'PENDING';
};

export const canCancelSale = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
  status: SaleStatus,
): boolean => {
  if (status === 'CANCELLED') return false;
  if (isAdmin(role) || isGerente(role)) return true;
  return canManageSale(role, userId, ownerId) && status === 'PENDING';
};

/** ADMIN, GERENTE y OPERACIONES pueden crear, asignar y gestionar tareas de equipo. */
export const canManageTeamTasks = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isOperaciones(role);
