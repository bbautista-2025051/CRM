import type { NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import {
  extractBearerToken,
  verifyToken,
  type JwtPayload,
} from '../utils/jwt';
import type { AuthContext } from './auth';

/**
 * Middleware de autenticación por JWT (Bearer token).
 *
 * Espera el header: Authorization: Bearer <jwt>
 * Valida el token, carga el usuario asociado y lo expone en req.auth.
 * Las rutas protegidas pueden combinar este middleware con requireRole,
 * requireAdmin, requireCommercial, etc.
 */
export const requireJwtAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new UnauthorizedError(
        'Falta el token de autenticación. Usa el header Authorization: Bearer <token>',
      );
    }

    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new UnauthorizedError('Token inválido o expirado. Inicia sesión de nuevo.');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedError('El usuario asociado al token ya no existe.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('La cuenta está desactivada.');
    }

    req.auth = {
      user,
      session: {
        id: payload.sub,
        csrfToken: '',
        expiresAt: new Date((payload.exp ?? 0) * 1000),
        rememberMe: false,
      },
    } as AuthContext & { token: string };

    (req.auth as AuthContext & { token: string }).token = token;

    next();
  },
);

/**
 * Middleware de autorización por rol compatible con sesiones y JWT.
 * Requiere que req.auth esté poblado (por requireAuth o requireJwtAuth).
 */
export const requireJwtRole = (...roles: Array<User['role']>) => {
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

export const requireJwtAdmin = requireJwtRole('ADMIN');
