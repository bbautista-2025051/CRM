import type { NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { SESSION_COOKIE, hashSessionToken } from '../utils/session';

export interface AuthContext {
  user: User;
  session: {
    id: string;
    csrfToken: string;
    expiresAt: Date;
    rememberMe: boolean;
  };
}

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length < 20) {
      throw new UnauthorizedError();
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError('Tu sesión no es válida. Inicia sesión de nuevo.');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new UnauthorizedError('Tu sesión ha expirado. Inicia sesión de nuevo.');
    }

    if (session.user.status !== 'ACTIVE') {
      // Una cuenta desactivada pierde inmediatamente todas sus sesiones.
      await prisma.session.deleteMany({ where: { userId: session.userId } });
      throw new UnauthorizedError('La cuenta está desactivada.');
    }

    req.auth = {
      user: session.user,
      session: {
        id: session.id,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
        rememberMe: session.rememberMe,
      },
    };

    // Actualiza "última actividad" como máximo una vez cada 5 minutos.
    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      void prisma.session
        .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
        .catch(() => undefined);
    }

    next();
  },
);

export const requireRole = (...roles: Array<User['role']>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.auth.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
