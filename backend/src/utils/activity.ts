import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

interface ActivityInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * La auditoría nunca debe romper la operación de negocio principal.
 */
export const logActivity = async (input: ActivityInput): Promise<void> => {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description.slice(0, 300),
        metadata: input.metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error, entityType: input.entityType }, 'No se pudo registrar la actividad');
  }
};
