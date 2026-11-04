export const userCreateSchema = z.object({
  name: requiredText('El nombre', 120, 2),
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(255),
  password: passwordField,
  role: z.enum(['ADMIN', 'PROGRAMADOR', 'VENDEDOR', 'SUPERVISOR', 'OPERACIONES']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  mustChangePassword: z.boolean(),
});

export type UserCreateValues = z.infer<typeof userCreateSchema>;

export const userEditSchema = z.object({
  name: requiredText('El nombre', 120, 2),
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(255),
  role: z.enum(['ADMIN', 'PROGRAMADOR', 'VENDEDOR', 'SUPERVISOR', 'OPERACIONES']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type UserEditValues = z.infer<typeof userEditSchema>;
