import type { Request } from 'express';
import type { User } from '@prisma/client';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import {
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
} from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import {
  generateCsrfToken,
  generateSessionToken,
  getClientIp,
  getSessionExpiry,
  hashSessionToken,
} from '../../utils/session';
import { toPublicUser, type PublicUser } from '../../utils/serializers';

export interface CreatedSession {
  user: PublicUser;
  csrfToken: string;
  expiresAt: Date;
  rememberMe: boolean;
  token: string;
}

const googleClient = env.googleEnabled
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

export const createUserSession = async (
  user: User,
  rememberMe: boolean,
  req: Request,
): Promise<CreatedSession> => {
  const token = generateSessionToken();
  const csrfToken = generateCsrfToken();
  const expiresAt = getSessionExpiry(rememberMe);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      csrfToken,
      userId: user.id,
      expiresAt,
      rememberMe,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']?.slice(0, 500),
    },
  });

  return {
    user: toPublicUser(user),
    csrfToken,
    expiresAt,
    rememberMe,
    token,
  };
};

export const login = async (
  email: string,
  password: string,
  rememberMe: boolean,
  req: Request,
): Promise<CreatedSession> => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Mismo mensaje para usuario inexistente y contraseña incorrecta.
  if (!user?.passwordHash) {
    throw new UnauthorizedError('Correo electrónico o contraseña incorrectos');
  }

  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    throw new UnauthorizedError('Correo electrónico o contraseña incorrectos');
  }

  if (user.status !== 'ACTIVE') {
    throw new ForbiddenError(
      'Tu cuenta está desactivada. Contacta a un administrador.',
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'SESSION',
    description: `Inicio de sesión de ${user.name}`,
    metadata: { rememberMe },
  });

  // Limpieza oportunista de sesiones expiradas.
  void prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);

  return createUserSession(updatedUser, rememberMe, req);
};

export const logout = async (sessionId: string, userId: string): Promise<void> => {
  await prisma.session.deleteMany({ where: { id: sessionId } });
  await logActivity({
    userId,
    action: 'LOGOUT',
    entityType: 'SESSION',
    description: 'Cierre de sesión',
  });
};

export const changeOwnPassword = async (
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  newPassword: string,
): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  if (!user.passwordHash) {
    throw new BadRequestError(
      'Tu cuenta no tiene contraseña local. Contacta a un administrador.',
    );
  }

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    throw new BadRequestError('La contraseña actual no es correcta');
  }

  if (await verifyPassword(user.passwordHash, newPassword)) {
    throw new BadRequestError('La nueva contraseña debe ser diferente a la actual');
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

  // Invalida el resto de sesiones, conserva la sesión actual.
  await prisma.session.deleteMany({
    where: { userId, id: { not: currentSessionId } },
  });

  await logActivity({
    userId,
    action: 'PASSWORD_CHANGE',
    entityType: 'USER',
    entityId: userId,
    description: 'Cambio de contraseña',
  });

  return toPublicUser(updated);
};

const verifyGoogleCredential = async (credential: string): Promise<TokenPayload> => {
  if (!googleClient || !env.googleEnabled) {
    throw new BadRequestError('El inicio de sesión con Google no está habilitado');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('Token sin datos de identidad');
    }
    return payload;
  } catch {
    throw new UnauthorizedError(
      'No se pudo verificar la cuenta de Google. Inténtalo de nuevo.',
    );
  }
};

/**
 * OIDC con Google. Nunca crea usuarios: exige que el google_id ya esté
 * vinculado a una cuenta interna activa.
 */
export const loginWithGoogle = async (
  credential: string,
  req: Request,
): Promise<CreatedSession> => {
  const payload = await verifyGoogleCredential(credential);

  if (!payload.email_verified) {
    throw new UnauthorizedError(
      'El correo de Google no está verificado. No es posible iniciar sesión.',
    );
  }

  const user = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });

  if (!user) {
    throw new ForbiddenError(
      'Esta cuenta de Google no está vinculada a un usuario del CRM. Solicita acceso a un administrador.',
    );
  }

  if (user.status !== 'ACTIVE') {
    throw new ForbiddenError('Tu cuenta está desactivada. Contacta a un administrador.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      // Solo se completa la foto si el usuario aún no tiene una.
      avatarUrl: user.avatarUrl ?? payload.picture ?? null,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'SESSION',
    description: `Inicio de sesión con Google de ${user.name}`,
    metadata: { provider: 'google' },
  });

  return createUserSession(updatedUser, false, req);
};

export const linkGoogleAccount = async (
  userId: string,
  credential: string,
): Promise<PublicUser> => {
  const payload = await verifyGoogleCredential(credential);

  if (!payload.email_verified || !payload.email) {
    throw new BadRequestError('La cuenta de Google debe tener el correo verificado');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  if (user.googleId && user.googleId !== payload.sub) {
    throw new BadRequestError(
      'Tu cuenta ya está vinculada a otra identidad de Google. Desvincúlala primero.',
    );
  }

  // Solo se permite vincular una identidad de Google cuyo correo coincida con
  // el correo corporativo registrado por el administrador.
  if (user.email.toLowerCase() !== payload.email.toLowerCase()) {
    throw new BadRequestError(
      'El correo de la cuenta de Google debe coincidir con tu correo en el CRM',
    );
  }

  const existingLink = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });
  if (existingLink && existingLink.id !== userId) {
    throw new BadRequestError(
      'Esa cuenta de Google ya está vinculada a otro usuario del CRM',
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      googleId: payload.sub,
      avatarUrl: user.avatarUrl ?? payload.picture ?? null,
    },
  });

  await logActivity({
    userId,
    action: 'GOOGLE_LINK',
    entityType: 'USER',
    entityId: userId,
    description: 'Cuenta de Google vinculada',
  });

  return toPublicUser(updated);
};

export const unlinkGoogleAccount = async (userId: string): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  if (!user.googleId) {
    throw new BadRequestError('Tu cuenta no tiene Google vinculado');
  }

  if (!user.passwordHash) {
    throw new BadRequestError(
      'Debes establecer una contraseña antes de desvincular Google, para no perder el acceso.',
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { googleId: null },
  });

  await logActivity({
    userId,
    action: 'GOOGLE_UNLINK',
    entityType: 'USER',
    entityId: userId,
    description: 'Cuenta de Google desvinculada',
  });

  return toPublicUser(updated);
};
