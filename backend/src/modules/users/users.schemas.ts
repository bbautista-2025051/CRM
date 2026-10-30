import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';
import { emailSchema, passwordSchema } from '../auth/auth.schemas';
import { paginationQuerySchema } from '../../utils/pagination';

export const userListQuerySchema = paginationQuerySchema.extend({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt']).optional(),
});

export const userIdSchema = z.object({
  id: z.string().uuid('El identificador no es válido'),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.nativeEnum(Role).default(Role.VENDEDOR),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  mustChangePassword: z.boolean().default(true),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre es obligatorio').max(120).optional(),
    email: emailSchema.optional(),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});
