import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const allowed = new Set([...env.allowedOrigins, env.appUrl]);

/**
 * Defensa adicional contra CSRF: si el navegador envía Origin, debe pertenecer
 * a la lista blanca. Las peticiones sin Origin (curl, pruebas, SSR) se aceptan
 * y quedan protegidas por el token CSRF cuando hay sesión.
 */
export const originCheck = (req: Request, res: Response, next: NextFunction): void => {
  if (!UNSAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin) {
    const normalized = origin.replace(/\/+$/, '');
    if (!allowed.has(normalized)) {
      res.status(403).json({
        error: {
          code: 'ORIGIN_NOT_ALLOWED',
          message: 'El origen de la solicitud no está permitido',
        },
      });
      return;
    }
  }

  next();
};
