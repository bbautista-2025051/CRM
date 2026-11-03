import { z } from 'zod';
import { ProjectStatus, TaskStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../utils/pagination';
import { optionalDateOnly, optionalId, optionalText } from '../../utils/zod';

export const projectListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ProjectStatus).optional(),
  companyId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  sortBy: z
    .enum(['name', 'status', 'startDate', 'dueDate', 'createdAt', 'updatedAt'])
    .optional(),
});

export const projectBodySchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(180),
  description: optionalText(4000, 'La descripción'),
  companyId: optionalId(),
  managerId: optionalId(),
  status: z.nativeEnum(ProjectStatus).optional().default(ProjectStatus.ACTIVE),
  startDate: optionalDateOnly('La fecha de inicio'),
  dueDate: optionalDateOnly('La fecha de entrega'),
});

export const updateProjectSchema = projectBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const taskBodySchema = z.object({
  title: z.string().trim().min(2, 'El título es obligatorio').max(180),
  description: optionalText(4000, 'La descripción'),
  assigneeId: z.string().uuid('El responsable no es válido'),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.PENDING),
  dueDate: optionalDateOnly('La fecha límite'),
});

export const updateTaskSchema = taskBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  });

export const projectTaskParamsSchema = z.object({
  id: z.string().uuid('El identificador del proyecto no es válido'),
  taskId: z.string().uuid('El identificador de la tarea no es válido'),
});

export const teamQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  search: z.string().trim().max(120).optional(),
});
