interface DashboardFilters {
  role?: 'ADMIN' | 'PROGRAMADOR' | 'VENDEDOR' | 'SUPERVISOR' | 'OPERACIONES';
  userId?: string;
  month?: string | number;
  year?: string | number;
}
