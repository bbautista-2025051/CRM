import { z } from 'zod';
import { SaleStatus } from '@prisma/client';
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
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  sortBy: z
    .enum(['saleNumber', 'saleDate', 'amount', 'status', 'createdAt', 'updatedAt'])
    .optional(),
});

export const saleBodySchema = z.object({
  companyId: optionalId(),
  clientId: optionalId(),
  opportunityId: optionalId(),
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
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
});
