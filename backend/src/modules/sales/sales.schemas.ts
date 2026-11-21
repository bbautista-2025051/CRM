import { z } from 'zod';
import { SaleStatus, TicketStage } from '@prisma/client';
import { paginationQuerySchema } from '../../utils/pagination';
import {
  moneySchema,
  optionalId,
  optionalText,
  requiredDateOnly,
} from '../../utils/zod';

export const saleListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(SaleStatus).optional(),
  ownerId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  hasTicket: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  ticketStage: z.nativeEnum(TicketStage).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  sortBy: z
    .enum([
      'saleNumber',
      'saleDate',
      'amount',
      'status',
      'ticketNumber',
      'createdAt',
      'updatedAt',
    ])
    .optional(),
});

export const saleBodySchema = z
  .object({
    companyId: optionalId(),
    clientId: optionalId(),
    opportunityId: optionalId(),
    opportunityName: optionalText(180, 'La oportunidad ganada'),
    ownerId: z.string().uuid('El responsable no es válido').optional(),
    saleDate: requiredDateOnly('La fecha de venta'),
    amount: moneySchema,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'La moneda debe ser un código ISO de 3 letras (ej. GTQ)')
      .default('GTQ'),
    status: z.nativeEnum(SaleStatus).optional().default(SaleStatus.PENDING),
    notes: optionalText(2000, 'Las observaciones'),
  })
  .refine((data) => Boolean(data.opportunityId || data.opportunityName), {
    message: 'La oportunidad ganada es obligatoria',
    path: ['opportunityName'],
  })
  .refine((data) => !data.opportunityName || data.opportunityName.length >= 2, {
    message: 'La oportunidad ganada debe tener al menos 2 caracteres',
    path: ['opportunityName'],
  });

export const saleCommentBodySchema = z.object({
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

export const saleFileParamsSchema = z.object({
  id: z.string().uuid('El identificador de la venta no es válido'),
  fileId: z.string().uuid('El identificador del archivo no es válido'),
});

export const updateSaleTicketSchema = z.object({
  ticketStage: z.nativeEnum(TicketStage),
});

export const updateSaleSchema = z
  .object({
    companyId: optionalId(),
    clientId: optionalId(),
    saleDate: requiredDateOnly('La fecha de venta').optional(),
    amount: moneySchema.optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'La moneda debe ser un código ISO de 3 letras (ej. GTQ)')
      .optional(),
    status: z.nativeEnum(SaleStatus).optional(),
    notes: optionalText(2000, 'Las observaciones'),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const saleSummaryQuerySchema = z.object({
  ownerId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
});

export const customSaleStatusBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre del estado debe tener al menos 2 caracteres')
    .max(60, 'El nombre del estado no puede superar 60 caracteres'),
});

export const customSaleStatusParamsSchema = z.object({
  id: z.string().uuid('El identificador del estado no es válido'),
});