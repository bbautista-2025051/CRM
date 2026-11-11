import type { Role, SaleStatus } from '@/types';

// --- Funciones de identificación de rol ---

export const isAdmin = (role: Role | undefined | null): boolean => role === 'ADMIN';

export const isGerente = (role: Role | undefined | null): boolean => role === 'GERENTE';

export const isPreventa = (role: Role | undefined | null): boolean => role === 'PREVENTA';

export const isSupervisor = (role: Role | undefined | null): boolean => role === 'SUPERVISOR';

export const isProgramador = (role: Role | undefined | null): boolean => role === 'PROGRAMADOR';

export const isOperaciones = (role: Role | undefined | null): boolean => role === 'OPERACIONES';

export const isVendedor = (role: Role | undefined | null): boolean => role === 'VENDEDOR';

// --- Funciones de permiso con lógica de departamento ---

/**
 * Verifica si el usuario puede gestionar otros usuarios.
 * Solo ADMIN tiene este permiso.
 */
export const canManageUsers = (role: Role | undefined | null): boolean => isAdmin(role);

/**
 * Verifica si el usuario puede archivar recursos.
 * Solo ADMIN tiene este permiso.
 */
export const canArchive = (role: Role | undefined | null): boolean => isAdmin(role);

/**
 * Verifica si el usuario puede confirmar ventas.
 * ADMIN y GERENTE pueden confirmar ventas.
 */
export const canConfirmSales = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role);

/**
 * Verifica si el usuario puede gestionar una oportunidad.
 * ADMIN, GERENTE o el dueño de la oportunidad pueden gestionarla.
 */
export const canManageOpportunity = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
): boolean =>
  isAdmin(role) ||
  isGerente(role) ||
  (Boolean(userId) && userId === ownerId);

/**
 * Verifica si el usuario puede gestionar una venta.
 * ADMIN, GERENTE o el dueño de la venta pueden gestionarla.
 */
export const canManageSale = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
): boolean =>
  isAdmin(role) ||
  isGerente(role) ||
  (Boolean(userId) && userId === ownerId);

/**
 * Verifica si el usuario puede editar una venta.
 * Las ventas CANCELLED no se pueden editar.
 * ADMIN y GERENTE pueden editar cualquier venta.
 * El dueño solo puede editar ventas PENDING.
 */
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

/**
 * Verifica si el usuario puede cancelar una venta.
 * ADMIN y GERENTE pueden cancelar ventas.
 * Vendedores con autorización pueden cancelar ventas PENDING.
 */
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

/**
 * Verifica si el usuario puede editar campos de proyecto.
 * ADMIN tiene acceso total.
 * VENDEDOR solo puede editar proyectos asignados a él (managerId).
 * Otros roles pueden tener acceso condicional según departamento.
 */
export const canEditProjectFields = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  managerId: string | null,
): boolean =>
  isAdmin(role) ||
  (role === 'VENDEDOR' && Boolean(userId) && userId === managerId);

/**
 * Verifica si el usuario puede aprobar una venta confirmada.
 * Solo ADMIN y GERENTE pueden aprobar ventas.
 */
export const canApproveConfirmedSale = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role);

/**
 * Verifica si el usuario puede crear proyectos.
 * ADMIN y GERENTE pueden crear proyectos.
 * Vendedor necesita una venta confirmada.
 */
export const canCreateProject = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role);

/**
 * Verifica si el usuario puede ver el dashboard completo.
 * La mayoría de los roles tienen acceso al dashboard.
 */
export const canViewDashboard = (role: Role | undefined | null): boolean => {
  if (!role) return false;
  return (
    isAdmin(role) ||
    isGerente(role) ||
    isPreventa(role) ||
    isSupervisor(role) ||
    isProgramador(role) ||
    isOperaciones(role) ||
    isVendedor(role)
  );
};

/**
 * Verifica si el usuario es vendedor.
 */
export const isVendedorRole = (role: Role | undefined | null): boolean =>
  role === 'VENDEDOR';

// --- Permisos de oportunidad por rol ---

/**
 * Verifica si el rol puede crear oportunidades.
 */
export const canCreateOpportunity = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isVendedor(role);

/**
 * Verifica si el rol puede editar oportunidades ajenas.
 * ADMIN y GERENTE pueden editar cualquier oportunidad.
 * Vendedores/Preventa/Operaciones solo pueden editar las suyas o asignadas.
 */
export const canEditOtherOpportunity = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
): boolean =>
  isAdmin(role) ||
  isGerente(role) ||
  (Boolean(userId) && userId === ownerId);

/**
 * Verifica si el rol puede eliminar oportunidades.
 * No puede eliminar oportunidades que tengan ventas asociadas.
 */
export const canDeleteOpportunity = (
  role: Role | undefined | null,
  userId: string | undefined | null,
  ownerId: string,
  hasSale: boolean,
): boolean =>
  !hasSale && canManageOpportunity(role, userId, ownerId);

// --- Permisos de venta por rol ---

/**
 * Verifica si el usuario puede crear una venta.
 * Vendedores, Preventa, Operaciones y Programador pueden crear ventas.
 * Admin y Gerente tienen acceso total.
 */
export const canCreateSale = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isVendedor(role) || isPreventa(role);

/**
 * Verifica si el usuario puede ver todas las ventas.
 * ADMIN ve todas, otros roles ven filtrado según sus permisos.
 */
export const canViewAllSales = (role: Role | undefined | null): boolean =>
  isAdmin(role);

/**
 * Verifica si el usuario puede modificar el estado de una venta.
 * Solo ADMIN y GERENTE pueden cambiar estado a CONFIRMED.
 * Vendedores/Preventa/Operaciones/PROGRAMADOR solo pueden ver/editar sus propias ventas PENDING.
 */
export const canModifySaleStatus = (
  role: Role | undefined | null,
  status: SaleStatus,
): boolean => {
  if (status === 'CANCELLED') return false;
  if (isAdmin(role) || isGerente(role)) return true;
  return status === 'PENDING';
};

// --- Permisos de tareas por rol ---

/**
 * Verifica si el usuario puede crear tareas.
 * ADMIN, GERENTE y OPERACIONES pueden crear tareas.
 */
export const canCreateTask = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isOperaciones(role);

/**
 * Verifica si el usuario puede asignar tareas.
 * ADMIN, GERENTE y OPERACIONES pueden asignar tareas.
 */
export const canAssignTask = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isOperaciones(role);

/** ADMIN, GERENTE y OPERACIONES pueden crear, asignar y gestionar tareas de equipo. */
export const canManageTeamTasks = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isOperaciones(role);

// --- Permisos de proyecto por rol ---

/**
 * Verifica si el usuario puede crear un proyecto.
 * Requiere una venta confirmada.
 */
export const canCreateProjectByRole = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isPreventa(role) || isOperaciones(role);

// --- Permisos de dashboard y reporte ---

/**
 * Verifica si el usuario puede acceder a métricas específicas por departamento.
 */
export const canViewDepartmentMetrics = (
  role: Role | undefined | null,
  userDepartment: string | null,
  targetDepartment: string | null,
): boolean => {
  if (!userDepartment || !targetDepartment) return false;
  if (isAdmin(role)) return true;
  if (isGerente(role)) return true;
  if (isSupervisor(role)) return userDepartment === targetDepartment;
  if (isPreventa(role) || isOperaciones(role)) {
    return userDepartment === targetDepartment;
  }
  return false;
};

// --- Permisos específicos de flujo de trabajo ---

/**
 * Verifica si el usuario puede iniciar el flujo de venta.
 * Vendedores pueden crear ventas PENDING.
 */
export const canStartSaleFlow = (role: Role | undefined | null): boolean =>
  isVendedor(role) || isPreventa(role) || isOperaciones(role);

/**
 * Verifica si el usuario puede terminar/cerrar un proyecto.
 * ADMIN, GERENTE y OPERACIONES pueden cerrar proyectos.
 */
export const canCloseProject = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role) || isOperaciones(role);

/**
 * Verifica si el usuario puede reiniciar un proyecto.
 * Solo ADMIN puede reiniciar proyectos cerrados o archivados.
 */
export const canReopenProject = (role: Role | undefined | null): boolean =>
  isAdmin(role);

/**
 * Verifica si el usuario puede ver información financiera restringida.
 * Solo ADMIN y GERENTE tienen acceso a márgenes, descuentos internos, etc.
 */
export const canViewFinancialData = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role);

/**
 * Verifica si el usuario puede gestionar configuraciones del sistema.
 * Solo ADMIN tiene este permiso.
 */
export const canManageSystemConfig = (role: Role | undefined | null): boolean =>
  isAdmin(role);

/**
 * Verifica si el usuario puede restablecer contraseñas de otros usuarios.
 * Solo ADMIN puede restablecer contraseñas.
 */
export const canResetPasswords = (role: Role | undefined | null): boolean =>
  isAdmin(role);

/**
 * Verifica si el usuario puede ver el historial/auditoría completo.
 * ADMIN y GERENTE pueden ver auditoría completa.
 * Otros roles ven solo su propio historial.
 */
export const canViewFullAuditLog = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role);

/**
 * Verifica si el usuario puede invitar a otros usuarios.
 * ADMIN y GERENTE pueden invitar usuarios.
 */
export const canInviteUsers = (role: Role | undefined | null): boolean =>
  isAdmin(role) || isGerente(role);
