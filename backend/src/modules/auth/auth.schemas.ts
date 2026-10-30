import { z } from 'zod';

const emailSchema = z
  .string({ required_error: 'El correo electrónico es obligatorio' })
  .trim()
  .toLowerCase()
  .email('Ingresa un correo electrónico válido')
  .max(255, 'El correo electrónico es demasiado largo');

export const passwordSchema = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
  rememberMe: z.boolean().optional().default(false),
});

export const googleCredentialSchema = z.object({
  credential: z
    .string({ required_error: 'La credencial de Google es obligatoria' })
    .min(100, 'La credencial de Google no es válida')
    .max(5000),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria').max(200),
  newPassword: passwordSchema,
});

export { emailSchema };
