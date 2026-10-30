import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const rateLimitHandler = (_req: unknown, res: import('express').Response): void => {
  res.status(429).json({
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
    },
  });
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 10_000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: rateLimitHandler,
});

export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isTest ? 10_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
