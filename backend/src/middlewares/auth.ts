const canManageAnyByRole = (role: User['role'] | undefined | null): boolean =>
  role === 'ADMIN' || role === 'GERENTE';

const canManageOwnOnly = (role: User['role'] | undefined | null): boolean =>
  role === 'VENDEDOR' || role === 'PREVENTA';
