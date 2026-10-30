import { z } from 'zod';
import { ClientStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../utils/pagination';
import { optionalEmail, optionalId, optionalText } from '../../utils/zod';

export const clientListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ClientStatus).optional(),
  companyId: z.string().uuid().optional(),
  sortBy: z
    .enum(['firstName', 'lastName', 'email', 'status', 'createdAt', 'updatedAt'])
    .optional(),
});

export const clientBodySchema = z.object({
  firstName: z.string().trim().min(2, 'El nombre es obligatorio').max(80),
  lastName: z.string().trim().min(2, 'El apellido es obligatorio').max(80),
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Ingresa un correo electrónico válido')
    .max(255),
  phone: optionalText(40, 'El teléfono'),
  jobTitle: optionalText(120, 'El cargo'),
  companyId: optionalId(),
  status: z.nativeEnum(ClientStatus).optional().default(ClientStatus.ACTIVE),
  notes: optionalText(2000, 'Las notas'),
});

export const updateClientSchema = clientBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const clientOptionsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  companyId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
