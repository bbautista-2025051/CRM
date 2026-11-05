    role: typeof query.role === 'string' && query.role ? (query.role as 'ADMIN' | 'VENDEDOR' | 'PREVENTA' | 'GERENTE' | 'OPERACIONES') : undefined,
