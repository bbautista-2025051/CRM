import { z } from 'zod';
import { Role } from '@prisma/client';

const currentYear = new Date().getUTCFullYear();

export const dashboardQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  userId: z.string().uuid('El identificador del usuario no es válido').optional(),
  month: z
    .string()
    .regex(/^(?:[1-9]|1[0-2]|all)$/, 'El mes debe estar entre 1 y 12')
    .optional(),
  year: z
    .string()
    .regex(/^\d{4}$/, 'El año debe tener cuatro dígitos')
    .refine((value) => Number(value) >= 2000 && Number(value) <= currentYear + 1, {
      message: `El año debe estar entre 2000 y ${currentYear + 1}`,
    })
    .optional(),
});
