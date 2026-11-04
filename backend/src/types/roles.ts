export const Role = {
  ADMIN: 'ADMIN',
  PROGRAMADOR: 'PROGRAMADOR',
  VENDEDOR: 'VENDEDOR',
  SUPERVISOR: 'SUPERVISOR',
  OPERACIONES: 'OPERACIONES',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
