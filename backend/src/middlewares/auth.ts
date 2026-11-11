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
 * Obtiene los tokens de sesión candidatos: primero la cookie HttpOnly y luego,
 * como respaldo, el header `Authorization: Bearer`.
 *
 * El respaldo permite autenticar cuando el frontend y la API viven en dominios
 * distintos y el navegador bloquea las cookies de terceros (modo incógnito de
 * Chrome, navegación privada de Safari/iOS). Es la misma sesión opaca guardada
 * en la base de datos, así que el cierre de sesión y la expiración siguen
 * funcionando igual.
 *
 * Se devuelven ambos porque un navegador puede conservar una cookie vieja que
 * ya no corresponde a ninguna sesión (por ejemplo, tras reiniciar la base de
 * datos o rotar el secreto). En ese caso se debe probar el Bearer en lugar de
 * rechazar la petición por la cookie inválida.
 */
const getSessionTokens = (req: Request): string[] => {
  const tokens: string[] = [];

  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken.length >= 20) {
    tokens.push(cookieToken);
  }

  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken && bearerToken.length >= 20 && !tokens.includes(bearerToken)) {
    tokens.push(bearerToken);
  }

  return tokens;
};

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const tokens = getSessionTokens(req);
    if (tokens.length === 0) {
      throw new UnauthorizedError();
    }

    const hashedTokens = tokens.map((token) => hashSessionToken(token));
    const sessions = await prisma.session.findMany({
      where: { tokenHash: { in: hashedTokens } },
      include: { user: true },
    });
    const sessionsByHash = new Map(sessions.map((session) => [session.tokenHash, session]));

    let session: (typeof sessions)[number] | null = null;
    let expiredSessionId: string | null = null;
    let inactiveUserId: string | null = null;

    // Se respeta el orden cookie → Bearer, pero solo se acepta la primera
    // sesión realmente válida.
    for (const hash of hashedTokens) {
      const candidate = sessionsByHash.get(hash);
      if (!candidate) continue;

      if (candidate.expiresAt.getTime() <= Date.now()) {
        expiredSessionId ??= candidate.id;
        continue;
      }

      if (candidate.user.status !== 'ACTIVE') {
        inactiveUserId ??= candidate.userId;
        continue;
      }

      session = candidate;
      break;
    }

    if (!session) {
      if (inactiveUserId) {
        await prisma.session.deleteMany({ where: { userId: inactiveUserId } });
        throw new UnauthorizedError('La cuenta está desactivada.');
      }

      if (expiredSessionId) {
        await prisma.session
          .delete({ where: { id: expiredSessionId } })
          .catch(() => undefined);
        throw new UnauthorizedError('Tu sesión ha expirado. Inicia sesión de nuevo.');
      }

      throw new UnauthorizedError('Tu sesión no es válida. Inicia sesión de nuevo.');
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
