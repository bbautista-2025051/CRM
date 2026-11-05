export const userCreateSchema = z.object({
  name: requiredText('El nombre', 120, 2),
  email: emailField,
  password: passwordField,
  role: z.enum(['ADMIN', 'VENDEDOR', 'PREVENTA', 'GERENTE', 'OPERACIONES', 'PROGRAMADOR', 'SUPERVISOR']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  mustChangePassword: z.boolean(),
});
export type UserCreateValues = z.infer<typeof userCreateSchema>;

export const userEditSchema = z.object({
  name: requiredText('El nombre', 120, 2),
  email: emailField,
  role: z.enum(['ADMIN', 'VENDEDOR', 'PREVENTA', 'GERENTE', 'OPERACIONES', 'PROGRAMADOR', 'SUPERVISOR']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export type UserEditValues = z.infer<typeof userEditSchema>;
