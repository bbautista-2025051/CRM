import { env } from './env';

/**
 * Configuración de JWT (JSON Web Tokens) para autenticación de APIs mediante
 * Bearer token. Complementa (no reemplaza) el sistema de sesiones opacas con
 * cookies existente, permitiendo que clientes externos (mobile, scripts,
 * integraciones) se autentiquen sin depender de cookies.
 */
export const jwtConfig = {
  secret: env.jwtSecret,
  expiresIn: env.jwtExpiresIn,
  algorithm: 'HS256' as const,
  issuer: 'nexo-crm',
  audience: 'nexo-crm-api',
};

export type JwtPayload = {
  sub: string; // id del usuario
  role: string;
  email: string;
  iat?: number;
  exp?: number;
};
