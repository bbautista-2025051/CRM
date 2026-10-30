import { z } from 'zod';

const emptyToNull = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === '') return null;
  return value.trim();
};

/**
 * Importante: `.optional()` va DESPUÉS de `.transform()`. Así, cuando el campo
 * no viene en el JSON, Zod devuelve `undefined` y las actualizaciones parciales
 * no sobrescriben columnas que el cliente no envió. Un `null` o cadena vacía
 * explícitos sí limpian el campo.
 */
export const optionalText = (max: number, label = 'El campo') =>
  z
    .union([z.string().max(max, `${label} no puede superar ${max} caracteres`), z.null()])
    .transform(emptyToNull)
    .optional();

export const optionalEmail = () =>
  z
    .union([z.string().trim().email('Ingresa un correo válido').max(255), z.literal(''), z.null()])
    .transform(emptyToNull)
    .optional();

export const optionalWebsite = () =>
  z
    .union([
      z
        .string()
        .trim()
        .max(300, 'La URL es demasiado larga')
        .refine(
          (value) =>
            value === '' ||
            /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i.test(
              value,
            ),
          'Ingresa una URL válida',
        ),
      z.null(),
    ])
    .transform((value) => {
      const normalized = emptyToNull(value);
      if (!normalized) return normalized;
      return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    })
    .optional();

export const optionalDateOnly = (label = 'La fecha') =>
  z
    .union([
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} debe tener formato AAAA-MM-DD`)
        .refine((value) => {
          const date = new Date(`${value}T00:00:00.000Z`);
          return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
        }, `${label} no es una fecha válida`),
      z.literal(''),
      z.null(),
    ])
    .transform((value) => {
      if (value === undefined) return undefined;
      if (!value) return null;
      return new Date(`${value}T00:00:00.000Z`);
    })
    .optional();

export const requiredDateOnly = (label = 'La fecha') =>
  z
    .string({ required_error: `${label} es obligatoria` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} debe tener formato AAAA-MM-DD`)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    }, `${label} no es una fecha válida`)
    .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const moneySchema = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === 'string' ? Number(value) : value))
  .refine((value) => Number.isFinite(value), 'Ingresa un importe válido')
  .refine((value) => value > 0, 'El importe debe ser mayor que cero')
  .refine((value) => value <= 999_999_999_999.99, 'El importe es demasiado grande')
  .transform((value) => value.toFixed(2));

export const idParamSchema = z.object({
  id: z.string().uuid('El identificador no es válido'),
});

export const optionalId = () =>
  z
    .union([z.string().uuid('El identificador no es válido'), z.literal(''), z.null()])
    .transform((value) => {
      if (value === undefined) return undefined;
      return value ? value : null;
    })
    .optional();
