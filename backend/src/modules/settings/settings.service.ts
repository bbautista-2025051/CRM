import type { ThemePreference } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { toPublicUser, type PublicUser } from '../../utils/serializers';

export const updateProfile = async (
  userId: string,
  name: string,
): Promise<PublicUser> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
  });

  await logActivity({
    userId,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: userId,
    description: 'Perfil personal actualizado',
  });

  return toPublicUser(user);
};

export const updatePreferences = async (
  userId: string,
  themePreference: ThemePreference,
): Promise<PublicUser> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { themePreference },
  });

  return toPublicUser(user);
};
