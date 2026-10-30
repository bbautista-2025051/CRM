import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const safeCompare = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

/**
 * Protección CSRF de doble verificación: la sesión guarda un token que el
 * cliente debe reenviar en la cabecera X-CSRF-Token en cada mutación.
 * Debe ejecutarse después de requireAuth.
 */
export const csrfProtection = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (!req.auth) {
    next(new UnauthorizedError());
    return;
  }

  const header = req.headers['x-csrf-token'];
  const token = Array.isArray(header) ? header[0] : header;

  if (typeof token !== 'string' || !safeCompare(token, req.auth.session.csrfToken)) {
    next(new ForbiddenError('Token CSRF inválido o ausente. Recarga la página.'));
    return;
  }

  next();
};
