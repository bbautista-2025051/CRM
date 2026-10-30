import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { hashPassword } from '../../utils/password';
import {
  buildOrderBy,
  buildPaginationMeta,
  skipTake,
  type PaginationMeta,
} from '../../utils/pagination';
import { toPublicUser, type PublicUser } from '../../utils/serializers';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: User['role'];
  status?: User['status'];
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

const SORTABLE = ['name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'] as const;

export const listUsers = async (
  params: ListParams,
): Promise<{ data: PublicUser[]; meta: PaginationMeta }> => {
  const where: Prisma.UserWhereInput = {
    ...(params.role ? { role: params.role } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: buildOrderBy(params.sortBy, SORTABLE, params.sortOrder, 'createdAt'),
      ...skipTake(params.page, params.pageSize),
    }),
  ]);

  return {
    data: users.map(toPublicUser),
    meta: buildPaginationMeta(total, params.page, params.pageSize),
  };
};

export const getUser = async (id: string): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('El usuario no existe');
  return toPublicUser(user);
};

export const createUser = async (
  input: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    status: User['status'];
    mustChangePassword: boolean;
  },
  actorId: string,
): Promise<PublicUser> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('Ya existe un usuario con ese correo electrónico');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      status: input.status,
      mustChangePassword: input.mustChangePassword,
    },
  });

  await logActivity({
    userId: actorId,
    action: 'CREATE',
    entityType: 'USER',
    entityId: user.id,
    description: `Usuario creado: ${user.name} (${user.role})`,
  });

  return toPublicUser(user);
};

export const updateUser = async (
  id: string,
  input: {
    name?: string;
    email?: string;
    role?: User['role'];
    status?: User['status'];
  },
  actor: User,
): Promise<PublicUser> => {
  if (id === actor.id) {
    if (input.role && input.role !== actor.role) {
      throw new ForbiddenError('No puedes cambiar tu propio rol');
    }
    if (input.status === 'INACTIVE') {
      throw new ForbiddenError('No puedes desactivar tu propia cuenta');
    }
  }

  const updated = await prisma.$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({ where: { id } });
      if (!target) throw new NotFoundError('El usuario no existe');

      const nextRole = input.role ?? target.role;
      const nextStatus = input.status ?? target.status;
      const removesActiveAdmin =
        target.role === 'ADMIN' &&
        target.status === 'ACTIVE' &&
        (nextRole !== 'ADMIN' || nextStatus !== 'ACTIVE');

      if (removesActiveAdmin) {
        const otherActiveAdmins = await tx.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE', id: { not: target.id } },
        });
        if (otherActiveAdmins === 0) {
          throw new ConflictError(
            'No puedes desactivar o degradar al último administrador activo',
          );
        }
      }

      const user = await tx.user.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });

      if (nextStatus === 'INACTIVE') {
        await tx.session.deleteMany({ where: { userId: id } });
      }

      return user;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  const changes: string[] = [];
  if (input.name) changes.push('nombre');
  if (input.email) changes.push('correo');
  if (input.role) changes.push(`rol → ${input.role}`);
  if (input.status) changes.push(`estado → ${input.status}`);

  await logActivity({
    userId: actor.id,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: updated.id,
    description: `Usuario actualizado: ${updated.name}${changes.length ? ` (${changes.join(', ')})` : ''}`,
  });

  return toPublicUser(updated);
};

export const resetUserPassword = async (
  id: string,
  newPassword: string,
  actor: User,
): Promise<void> => {
  if (id === actor.id) {
    throw new BadRequestError(
      'Usa la configuración de tu cuenta para cambiar tu propia contraseña',
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError('El usuario no existe');

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);

  await logActivity({
    userId: actor.id,
    action: 'PASSWORD_RESET',
    entityType: 'USER',
    entityId: id,
    description: `Contraseña restablecida para ${target.name}`,
  });
};
