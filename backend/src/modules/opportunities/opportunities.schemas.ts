import { z } from 'zod';
import { OpportunityStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../utils/pagination';
import {
  moneySchema,
  optionalDateOnly,
  optionalText,
} from '../../utils/zod';

export const opportunityListQuerySchema = paginationQuerySchema.extend({
  stage: z.string().trim().min(1).max(60).optional(),
  status: z.nativeEnum(OpportunityStatus).optional(),
  ownerId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  expectedCloseFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  expectedCloseTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  sortBy: z
    .enum([
      'name',
      'value',
      'probability',
      'expectedCloseDate',
      'stage',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .optional(),
});

export const opportunityBodySchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(180),
  description: optionalText(4000, 'La descripción'),
  companyId: z
    .string({
      required_error: 'La empresa es obligatoria',
      invalid_type_error: 'La empresa no es válida',
    })
    .uuid('La empresa no es válida'),
  clientId: z
    .string({
      required_error: 'El cliente es obligatorio',
      invalid_type_error: 'El cliente no es válido',
    })
    .uuid('El cliente no es válido'),
  ownerId: z.string().uuid('El responsable no es válido').optional(),
  value: moneySchema,
  probability: z.coerce
    .number()
    .int('La probabilidad debe ser un número entero')
    .min(0, 'La probabilidad mínima es 0')
    .max(100, 'La probabilidad máxima es 100')
    .default(50),
  expectedCloseDate: optionalDateOnly('La fecha estimada de cierre'),
  stage: z.string().trim().min(1).max(60).optional().default('NEGOCIACION'),
});

export const updateOpportunitySchema = opportunityBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const opportunityCommentBodySchema = z.object({
  body: z
    .string({ required_error: 'Escribe un comentario' })
    .trim()
    .min(1, 'Escribe un comentario')
    .max(4000, 'El comentario no puede superar 4000 caracteres'),
  fileIds: z
    .array(z.string().uuid('El identificador del archivo no es válido'))
    .max(10, 'Puedes adjuntar hasta 10 archivos por comentario')
    .optional(),
});

export const opportunityFileParamsSchema = z.object({
  id: z.string().uuid('El identificador de la oportunidad no es válido'),
  fileId: z.string().uuid('El identificador del archivo no es válido'),
});

export const opportunityStageBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre de la etapa debe tener al menos 2 caracteres')
    .max(60, 'El nombre de la etapa no puede superar 60 caracteres'),
});
