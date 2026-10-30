import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { loginLimiter, sensitiveLimiter } from '../../middlewares/rateLimit';
import { validate } from '../../middlewares/validate';
import * as controller from './auth.controller';
import {
  changePasswordSchema,
  googleCredentialSchema,
  loginSchema,
} from './auth.schemas';

export const authRouter = Router();

authRouter.get('/google/status', controller.googleStatus);

authRouter.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  controller.login,
);

authRouter.post(
  '/google',
  loginLimiter,
  validate({ body: googleCredentialSchema }),
  controller.loginWithGoogle,
);

authRouter.get('/me', requireAuth, controller.me);

authRouter.post('/logout', requireAuth, csrfProtection, controller.logout);

authRouter.post(
  '/password',
  requireAuth,
  csrfProtection,
  sensitiveLimiter,
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);
