import type { User } from '@prisma/client';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  status: User['status'];
  avatarUrl: string | null;
  themePreference: User['themePreference'];
  mustChangePassword: boolean;
  googleLinked: boolean;
  hasPassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  avatarUrl: user.avatarUrl,
  themePreference: user.themePreference,
  mustChangePassword: user.mustChangePassword,
  googleLinked: Boolean(user.googleId),
  hasPassword: Boolean(user.passwordHash),
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

/** Serializa valores Decimal de Prisma sin perder precisión. */
export const decimalToString = (value: { toString(): string } | null): string | null =>
  value === null ? null : value.toString();
