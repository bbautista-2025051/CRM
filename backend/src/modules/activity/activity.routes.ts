import { z } from 'zod';
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/prisma';

const activityQuerySchema = z.object({
  entityType: z.string().trim().max(40).optional(),
  entityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const listActivity = asyncHandler(async (req, res) => {
  const { entityType, entityId, limit } = req.validated.query;

  const data = await prisma.activityLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  res.status(200).json({ data });
});

export const activityRouter = Router();

activityRouter.use(requireAuth);
activityRouter.get('/', validate({ query: activityQuerySchema }), listActivity);
