import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { jwtConfig, type JwtPayload } from '../config/jwt';
import { UnauthorizedError } from './errors';

export type { JwtPayload } from '../config/jwt';

const DEFAULT_VERIFY_OPTIONS: VerifyOptions = {
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
  algorithms: [jwtConfig.algorithm],
};

export const signToken = (
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  options?: SignOptions,
): string => {
  return jwt.sign(
    payload,
    jwtConfig.secret,
    {
      algorithm: jwtConfig.algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      expiresIn: jwtConfig.expiresIn,
      ...options,
    } as Parameters<typeof jwt.sign>[2],
  );
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, DEFAULT_VERIFY_OPTIONS);
    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Token inválido');
    }
    return decoded as JwtPayload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Token inválido o expirado');
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') return null;
    return decoded.payload as JwtPayload;
  } catch {
    return null;
  }
};

export const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
};
