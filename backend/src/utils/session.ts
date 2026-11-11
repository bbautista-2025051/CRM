import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';

export const SESSION_COOKIE = env.SESSION_COOKIE_NAME;

export const hashSessionToken = (token: string): string =>
  crypto.createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');

export const generateSessionToken = (): string =>
  crypto.randomBytes(32).toString('base64url');

export const generateCsrfToken = (): string =>
  crypto.randomBytes(32).toString('base64url');

export const getSessionExpiry = (rememberMe: boolean): Date =>
  new Date(Date.now() + (rememberMe ? env.sessionRememberMs : env.sessionTtlMs));

export const setSessionCookie = (
  res: Response,
  token: string,
  rememberMe: boolean,
): void => {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    // "none" permite sesiones cruzadas frontend/backend en producción
    // (siempre con HTTPS). En desarrollo se usa "lax" porque el proxy de
    // Vite sirve la API en el mismo origen y los navegadores rechazan
    // SameSite=None sin Secure.
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
    // Sin "Recuérdame" la cookie es de sesión del navegador; el servidor
    // además impone una expiración corta (SESSION_TTL_HOURS).
    maxAge: rememberMe ? env.sessionRememberMs : undefined,
  });
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
  });
};

export const getClientIp = (req: Request): string | undefined => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim().slice(0, 64);
  }
  return req.ip?.slice(0, 64);
};
