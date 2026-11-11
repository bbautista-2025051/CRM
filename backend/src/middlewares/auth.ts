import type { NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { extractBearerToken } from '../utils/jwt';
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

/**
 * Obtiene el token de sesión desde la cookie HttpOnly o, como respaldo, desde
 * el header `Authorization: Bearer`.
 *
 * El respaldo permite autenticar cuando el frontend y la API viven en dominios
 * distintos y el navegador bloquea las cookies de terceros (modo incógnito de
 * Chrome, navegación privada de Safari). Es la misma sesión opaca guardada en
 * la base de datos, así que el cierre de sesión y la expiración siguen
 * funcionando igual.
 */
const getSessionToken = (req: Request): string | null => {
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken.length >= 20) {
    return cookieToken;
  }

  const bearerToken = extractBearerToken(req.headers.authorization);
  return bearerToken && bearerToken.length >= 20 ? bearerToken : null;
};

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = getSessionToken(req);
    if (!token) {
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

/** Roles que pueden crear, asignar y gestionar tareas de equipo: ADMIN, GERENTE y OPERACIONES. */
export const requireTeamTaskManager = requireRole('ADMIN', 'GERENTE', 'OPERACIONES');
