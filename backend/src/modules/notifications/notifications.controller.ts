import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFoundError } from '../../utils/errors';
import { prisma } from '../../config/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const [data, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: req.auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.notification.count({
      where: { recipientId: req.auth.user.id, readAt: null },
    }),
  ]);

  res.status(200).json({ data: { notifications: data, unreadCount } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const updated = await prisma.notification.updateMany({
    where: {
      id: req.validated.params.id,
      recipientId: req.auth.user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const notification = await prisma.notification.findFirst({
    where: { id: req.validated.params.id, recipientId: req.auth.user.id },
  });
  if (!notification) throw new NotFoundError('La notificación no existe');

  res.status(200).json({ data: notification, updated: updated.count > 0 });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const result = await prisma.notification.updateMany({
    where: { recipientId: req.auth.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  res.status(200).json({ data: { updated: result.count } });
});
