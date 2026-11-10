import { z } from 'zod';
import { CompanyStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../utils/pagination';
import { optionalEmail, optionalText, optionalWebsite } from '../../utils/zod';

export const companyListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(CompanyStatus).optional(),
  sector: z.string().trim().max(100).optional(),
  sortBy: z
    .enum(['name', 'sector', 'status', 'createdAt', 'updatedAt'])
    .optional(),
});

export const companyBodySchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(160),
  legalName: optionalText(200, 'El nombre legal'),
  taxId: optionalText(40, 'El NIT'),
  sector: optionalText(100, 'El sector'),
  email: optionalEmail(),
  phone: optionalText(40, 'El teléfono'),
  address: optionalText(300, 'La dirección'),
  website: optionalWebsite(),
  status: z.nativeEnum(CompanyStatus).optional().default(CompanyStatus.ACTIVE),
  notes: optionalText(2000, 'Las notas'),
});

export const updateCompanySchema = companyBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const companyOptionsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const companyCommentBodySchema = z.object({
  body: z
    .string({ required_error: 'Escribe un comentario' })
    .trim()
    .min(1, 'Escribe un comentario')
    .max(4000, 'El comentario no puede superar 4000 caracteres'),
  fileIds: z
    .array(z.string().uuid('El identificador del archivo no es válido'))
    .max(10, {
      message: 'Puedes adjuntar hasta 10 archivos por comentario',
    })
    .optional(),
});

export const companyFileParamsSchema = z.object({
  id: z.string().uuid('El identificador de la empresa no es válido'),
  fileId: z.string().uuid('El identificador del archivo no es válido'),
});

