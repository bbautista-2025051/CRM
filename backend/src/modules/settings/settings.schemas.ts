import { z } from 'zod';
import { ThemePreference } from '@prisma/client';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(120),
});

export const updatePreferencesSchema = z.object({
  themePreference: z.nativeEnum(ThemePreference),
});

export const linkGoogleSchema = z.object({
  credential: z.string().min(100, 'La credencial de Google no es válida').max(5000),
});
