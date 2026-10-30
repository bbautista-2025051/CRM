import fs from 'node:fs';
import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { removeUploadedFile, validateImageSignature } from '../../middlewares/upload';
import { toPublicUser } from '../../utils/serializers';
import * as authService from '../auth/auth.service';
import * as settingsService from './settings.service';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const user = await prisma.user.findUnique({ where: { id: req.auth.user.id } });
  if (!user) throw new NotFoundError('El usuario no existe');

  res.status(200).json({
    data: {
      user: toPublicUser(user),
      googleEnabled: env.googleEnabled,
      googleClientId: env.googleEnabled ? env.GOOGLE_CLIENT_ID : null,
      session: {
        expiresAt: req.auth.session.expiresAt,
        rememberMe: req.auth.session.rememberMe,
      },
    },
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const user = await settingsService.updateProfile(
    req.auth.user.id,
    req.validated.body.name,
  );
  res.status(200).json({ data: { user }, message: 'Perfil actualizado correctamente' });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const user = await settingsService.updatePreferences(
    req.auth.user.id,
    req.validated.body.themePreference,
  );
  res.status(200).json({ data: { user } });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  if (!req.file) throw new BadRequestError('Selecciona una imagen para subir');

  try {
    validateImageSignature(req.file.path);
  } catch (error) {
    fs.promises.unlink(req.file.path).catch(() => undefined);
    throw error;
  }

  const publicUrl = `/uploads/avatars/${req.file.filename}`;

  try {
    const previous = await prisma.user.findUnique({
      where: { id: req.auth.user.id },
      select: { avatarUrl: true },
    });

    const user = await prisma.user.update({
      where: { id: req.auth.user.id },
      data: { avatarUrl: publicUrl },
    });

    if (previous?.avatarUrl && previous.avatarUrl !== publicUrl) {
      removeUploadedFile(previous.avatarUrl);
    }

    await logActivity({
      userId: user.id,
      action: 'AVATAR_UPDATE',
      entityType: 'USER',
      entityId: user.id,
      description: 'Foto de perfil actualizada',
    });

    res.status(200).json({
      data: { user: toPublicUser(user) },
      message: 'Foto de perfil actualizada',
    });
  } catch (error) {
    fs.promises.unlink(req.file.path).catch(() => undefined);
    throw error;
  }
});

export const deleteAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const previous = await prisma.user.findUnique({
    where: { id: req.auth.user.id },
    select: { avatarUrl: true },
  });

  const user = await prisma.user.update({
    where: { id: req.auth.user.id },
    data: { avatarUrl: null },
  });

  removeUploadedFile(previous?.avatarUrl);

  await logActivity({
    userId: user.id,
    action: 'AVATAR_DELETE',
    entityType: 'USER',
    entityId: user.id,
    description: 'Foto de perfil eliminada',
  });

  res.status(200).json({
    data: { user: toPublicUser(user) },
    message: 'Foto de perfil eliminada',
  });
});

export const linkGoogle = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const user = await authService.linkGoogleAccount(
    req.auth.user.id,
    req.validated.body.credential,
  );

  res.status(200).json({
    data: { user },
    message: 'Cuenta de Google vinculada correctamente',
  });
});

export const unlinkGoogle = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const user = await authService.unlinkGoogleAccount(req.auth.user.id);

  res.status(200).json({
    data: { user },
    message: 'Cuenta de Google desvinculada',
  });
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const sessions = await prisma.session.findMany({
    where: { userId: req.auth.user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      rememberMe: true,
      ipAddress: true,
      userAgent: true,
    },
  });

  res.status(200).json({
    data: sessions.map((session) => ({
      ...session,
      current: session.id === req.auth?.session.id,
    })),
  });
});

export const revokeOtherSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const result = await prisma.session.deleteMany({
    where: { userId: req.auth.user.id, id: { not: req.auth.session.id } },
  });

  await logActivity({
    userId: req.auth.user.id,
    action: 'SESSION_REVOKE',
    entityType: 'SESSION',
    description: `Se cerraron ${result.count} sesiones adicionales`,
  });

  res.status(200).json({
    data: { revoked: result.count },
    message:
      result.count > 0
        ? 'Se cerraron las demás sesiones activas'
        : 'No había otras sesiones activas',
  });
});
