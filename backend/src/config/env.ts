import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Carga .env desde el directorio del backend o desde la raíz del monorepo.
dotenv.config({
  path: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../.env')],
});

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: booleanFromEnv,
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  SESSION_COOKIE_NAME: z.string().min(1).default('nexo_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(8),
  SESSION_REMEMBER_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: booleanFromEnv,
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_AVATAR_SIZE_MB: z.coerce.number().int().min(1).max(10).default(2),
  DEFAULT_CURRENCY: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default('GTQ'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // No imprimimos valores para no filtrar secretos en los logs.
  throw new Error(`Configuración de entorno inválida:\n${issues}`);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';

const withDevAliases = (origins: string[]): string[] => {
  if (isProduction) return origins;
  const aliases = new Set(origins);
  origins.forEach((origin) => {
    if (/\/\/localhost(?=[:/]|$)/.test(origin)) {
      aliases.add(origin.replace('//localhost', '//127.0.0.1'));
    } else if (/\/\/127\.0\.0\.1(?=[:/]|$)/.test(origin)) {
      aliases.add(origin.replace('//127.0.0.1', '//localhost'));
    }
  });
  return [...aliases];
};

export const env = {
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  isDevelopment: raw.NODE_ENV === 'development',
  appUrl: raw.APP_URL.replace(/\/+$/, ''),
  allowedOrigins: withDevAliases(
    raw.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  ),
  cookieSecure: raw.COOKIE_SECURE || isProduction,
  googleEnabled: Boolean(raw.GOOGLE_CLIENT_ID),
  uploadDir: path.resolve(process.cwd(), raw.UPLOAD_DIR),
  maxAvatarBytes: raw.MAX_AVATAR_SIZE_MB * 1024 * 1024,
  sessionTtlMs: raw.SESSION_TTL_HOURS * 60 * 60 * 1000,
  sessionRememberMs: raw.SESSION_REMEMBER_DAYS * 24 * 60 * 60 * 1000,
};

export type Env = typeof env;
