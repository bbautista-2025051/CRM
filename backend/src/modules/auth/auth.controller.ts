import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../utils/asyncHandler';
import { toPublicUser } from '../../utils/serializers';
import { clearSessionCookie, setSessionCookie } from '../../utils/session';
import * as authService from './auth.service';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.validated.body;
  const session = await authService.login(email, password, rememberMe, req);

  setSessionCookie(res, session.token, session.rememberMe);

  res.status(200).json({
    data: {
      user: session.user,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      rememberMe: session.rememberMe,
      // Token de respaldo para clientes que no pueden usar la cookie de
      // sesión (cookies de terceros bloqueadas en incógnito o Safari).
      sessionToken: session.token,
    },
  });
});

export const loginWithGoogle = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.validated.body;
  const session = await authService.loginWithGoogle(credential, req);

  setSessionCookie(res, session.token, false);

  res.status(200).json({
    data: {
      user: session.user,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      rememberMe: false,
      sessionToken: session.token,
    },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  res.status(200).json({
    data: {
      user: toPublicUser(req.auth.user),
      csrfToken: req.auth.session.csrfToken,
      expiresAt: req.auth.session.expiresAt,
      rememberMe: req.auth.session.rememberMe,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth) {
    await authService.logout(req.auth.session.id, req.auth.user.id);
  }
  clearSessionCookie(res);
  res.status(204).send();
});

export const googleStatus = (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      enabled: env.googleEnabled,
      // El client ID es público por diseño (se incrusta en el navegador).
      clientId: env.googleEnabled ? env.GOOGLE_CLIENT_ID : null,
    },
  });
};

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;

  const { currentPassword, newPassword } = req.validated.body;
  const user = await authService.changeOwnPassword(
    req.auth.user.id,
    req.auth.session.id,
    currentPassword,
    newPassword,
  );

  res.status(200).json({ data: { user } });
});
