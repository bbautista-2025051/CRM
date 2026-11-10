import { z } from 'zod';

const requiredText = (label: string, max = 255, min = 1) =>
  z
    .string()
    .trim()
    .min(min, `${label} debe tener al menos ${min} caracteres`)
    .max(max, `${label} no puede superar ${max} caracteres`);

export const passwordField = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const emailField = z
  .string()
  .trim()
  .min(1, 'El correo electrónico es obligatorio')
  .email('Ingresa un correo electrónico válido')
  .max(255, 'El correo electrónico es demasiado largo');

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'Ingresa un correo electrónico válido',
  });

const optionalDate = z
  .string()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Ingresa una fecha válida',
  });

const amountField = z
  .string()
  .trim()
  .refine((value) => value !== '' && Number.isFinite(Number(value)) && Number(value) > 0, {
    message: 'El importe debe ser un número mayor que cero',
  });

export const emptyToNull = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
  rememberMe: z.boolean().default(false),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  name: requiredText('El nombre', 120, 2),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria').max(200),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z.object({ newPassword: passwordField });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const companyFormSchema = z.object({
  name: requiredText('El nombre', 160, 2),
  legalName: z.string().trim().max(200),
  taxId: z.string().trim().max(40),
  sector: z.string().trim().max(100),
  email: optionalEmail,
  phone: z.string().trim().max(40),
  address: z.string().trim().max(300),
  website: z
    .string()
    .trim()
    .max(300)
    .refine((value) => {
      if (!value) return true;
      try {
        const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
        return Boolean(new URL(candidate).hostname.includes('.'));
      } catch {
        return false;
      }
    }, 'Ingresa una URL válida'),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  notes: z.string().trim().max(10000),
});
export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export const clientFormSchema = z.object({
  firstName: requiredText('El nombre', 80, 1),
  lastName: requiredText('El apellido', 80, 1),
  email: emailField,
  phone: z.string().trim().max(40),
  jobTitle: z.string().trim().max(120),
  companyId: z.string(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  notes: z.string().trim().max(10000),
});
export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const opportunityFormSchema = z.object({
  name: requiredText('El nombre', 180, 2),
  description: z.string().trim().max(10000),
  companyId: z.string().min(1, 'La empresa es obligatoria'),
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  ownerId: z.string(),
  value: amountField,
  probability: z.string().refine(
    (value) => /^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 100,
    'La probabilidad debe ser un número entero entre 0 y 100',
  ),
  expectedCloseDate: optionalDate,
  stage: z.enum(['PROSPECTO', 'CALIFICACION', 'PROPUESTA', 'NEGOCIACION', 'GANADA', 'PERDIDA']),
});
export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

export const saleFormSchema = z.object({
  opportunityId: z.string(),
  clientId: z.string(),
  companyId: z.string(),
  ownerId: z.string(),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa una fecha válida'),
  amount: amountField,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'La moneda debe ser un código ISO de 3 letras'),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  notes: z.string().trim().max(10000),
});
export type SaleFormValues = z.infer<typeof saleFormSchema>;

export const projectFormSchema = z
  .object({
    name: requiredText('El nombre', 180, 2),
    description: z.string().trim().max(10000),
    phone: z.string().trim().max(40),
    companyId: z.string(),
    managerId: z.string(),
    status: z.enum(['ACTIVE', 'COMPLETED']),
    amount: z
      .string()
      .trim()
      .max(20)
      .refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0), {
        message: 'Ingresa un monto válido mayor que cero',
      }),
    currency: z.enum(['GTQ', 'USD']),
    preSales: z.string().trim().max(160),
    solution: z.string().trim().max(4000),
    startDate: optionalDate,
    dueDate: optionalDate,
  })
  .refine(
    ({ startDate, dueDate }) => !startDate || !dueDate || startDate <= dueDate,
    { message: 'La fecha de entrega no puede ser anterior a la fecha de inicio', path: ['dueDate'] },
  );
export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const taskFormSchema = z.object({
  title: requiredText('El título', 180, 2),
  description: z.string().trim().max(10000),
  assigneeId: requiredText('El integrante asignado', 64, 1),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  dueDate: optionalDate,
});
export type TaskFormValues = z.infer<typeof taskFormSchema>;

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
