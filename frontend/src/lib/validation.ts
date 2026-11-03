import { z } from 'zod';

const requiredText = (label: string, max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, `${label} es obligatorio`)
    .max(max, `${label} no puede superar ${max} caracteres`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} no puede superar ${max} caracteres`)
    .optional()
    .or(z.literal(''));

const optionalEmail = z
  .string()
  .trim()
  .max(255, 'El correo no puede superar 255 caracteres')
  .refine(
    (value) => value === '' || z.string().email().safeParse(value).success,
    'Ingresa un correo electrónico válido',
  );

const optionalWebsite = z
  .string()
  .trim()
  .max(300, 'La URL es demasiado larga')
  .refine(
    (value) =>
      value === '' ||
      /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i.test(
        value,
      ),
    'Ingresa una URL válida (ej. empresa.com)',
  );

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(new Date(`${value}T00:00:00`).getTime())),
      `${label} no es una fecha válida`,
    );

const moneyText = z
  .string()
  .trim()
  .min(1, 'Ingresa un importe')
  .refine((value) => Number.isFinite(Number(value)), 'Ingresa un importe válido')
  .refine((value) => Number(value) > 0, 'El importe debe ser mayor que cero')
  .refine(
    (value) => Number(value) <= 999_999_999_999.99,
    'El importe es demasiado grande',
  );

export const passwordField = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
  rememberMe: z.boolean().default(false),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const companyFormSchema = z.object({
  name: requiredText('El nombre', 160, 2),
  legalName: optionalText('El nombre legal', 200),
  taxId: optionalText('El NIT', 40),
  sector: optionalText('El sector', 100),
  email: optionalEmail,
  phone: optionalText('El teléfono', 40),
  address: optionalText('La dirección', 300),
  website: optionalWebsite,
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  notes: optionalText('Las notas', 2000),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export const clientFormSchema = z.object({
  firstName: requiredText('El nombre', 80, 2),
  lastName: requiredText('El apellido', 80, 2),
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(255),
  phone: optionalText('El teléfono', 40),
  jobTitle: optionalText('El cargo', 120),
  companyId: z.string().trim(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  notes: optionalText('Las notas', 2000),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const opportunityFormSchema = z.object({
  name: requiredText('El nombre', 180, 2),
  description: optionalText('La descripción', 4000),
  companyId: z.string().trim(),
  clientId: z.string().trim(),
  ownerId: z.string().trim(),
  value: moneyText,
  probability: z
    .string()
    .trim()
    .min(1, 'Indica una probabilidad')
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100,
      'La probabilidad debe ser un entero entre 0 y 100',
    ),
  expectedCloseDate: optionalDate('La fecha estimada'),
  stage: z.enum([
    'PROSPECTO',
    'CALIFICACION',
    'PROPUESTA',
    'NEGOCIACION',
    'GANADA',
    'PERDIDA',
  ]),
});

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

export const saleFormSchema = z.object({
  opportunityId: z.string().trim(),
  clientId: z.string().trim(),
  companyId: z.string().trim(),
  ownerId: z.string().trim(),
  saleDate: z
    .string()
    .trim()
    .min(1, 'La fecha de venta es obligatoria')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD'),
  amount: moneyText,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Usa un código ISO de 3 letras (ej. GTQ)'),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  notes: optionalText('Las observaciones', 2000),
});

export type SaleFormValues = z.infer<typeof saleFormSchema>;

export const projectFormSchema = z
  .object({
    name: requiredText('El nombre', 180, 2),
    description: optionalText('La descripción', 4000),
    companyId: z.string().trim(),
    managerId: z.string().trim(),
    status: z.enum(['ACTIVE', 'COMPLETED']),
    startDate: optionalDate('La fecha de inicio'),
    dueDate: optionalDate('La fecha de entrega'),
  })
  .refine(
    (data) =>
      !data.startDate || !data.dueDate || new Date(data.startDate) <= new Date(data.dueDate),
    { path: ['dueDate'], message: 'La entrega no puede ser anterior al inicio' },
  );

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const taskFormSchema = z.object({
  title: requiredText('El título', 180, 2),
  description: optionalText('La descripción', 4000),
  assigneeId: z.string().trim().min(1, 'Selecciona un integrante'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  dueDate: optionalDate('La fecha límite'),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const userCreateSchema = z.object({
  name: requiredText('El nombre', 120, 2),
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(255),
  password: passwordField,
  role: z.enum(['ADMIN', 'VENDEDOR']),
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
  role: z.enum(['ADMIN', 'VENDEDOR']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type UserEditValues = z.infer<typeof userEditSchema>;

export const resetPasswordSchema = z.object({
  newPassword: passwordField,
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  name: requiredText('El nombre', 120, 2),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Convierte cadenas vacías en null para los campos opcionales de la API. */
export const emptyToNull = (value: string | undefined): string | null =>
  value && value.trim() !== '' ? value.trim() : null;
