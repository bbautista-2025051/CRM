import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  clientFormSchema,
  companyFormSchema,
  emptyToNull,
  loginSchema,
  opportunityFormSchema,
  passwordField,
  saleFormSchema,
  userCreateSchema,
} from './validation';

const company = {
  name: 'Acme',
  legalName: '',
  taxId: '',
  sector: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  status: 'ACTIVE' as const,
  notes: '',
};

const sale = {
  opportunityId: '',
  clientId: '',
  companyId: '',
  ownerId: '',
  saleDate: '2026-10-30',
  amount: '1500.50',
  currency: 'gtq',
  status: 'PENDING' as const,
  notes: '',
};

describe('loginSchema', () => {
  it('acepta credenciales válidas y normaliza el correo', () => {
    const parsed = loginSchema.parse({
      email: '  Admin@Nexo.local ',
      password: 'secreta',
    });
    expect(parsed.email).toBe('Admin@Nexo.local');
    expect(parsed.rememberMe).toBe(false);
  });

  it('rechaza correos inválidos', () => {
    expect(loginSchema.safeParse({ email: 'no-es-correo', password: 'x' }).success).toBe(false);
  });
});

describe('passwordField', () => {
  it('exige longitud y complejidad', () => {
    expect(passwordField.safeParse('corta').success).toBe(false);
    expect(passwordField.safeParse('sinmayusculas123').success).toBe(false);
    expect(passwordField.safeParse('SinNumerosAqui').success).toBe(false);
    expect(passwordField.safeParse('ClaveSegura123').success).toBe(true);
  });
});

describe('companyFormSchema', () => {
  it('acepta una empresa válida con opcionales vacíos', () => {
    expect(companyFormSchema.safeParse(company).success).toBe(true);
  });

  it('rechaza un nombre demasiado corto', () => {
    const result = companyFormSchema.safeParse({ ...company, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('valida correo y sitio web opcionales', () => {
    expect(companyFormSchema.safeParse({ ...company, email: 'no-es-correo' }).success).toBe(false);
    expect(companyFormSchema.safeParse({ ...company, website: 'acme.com' }).success).toBe(true);
    expect(companyFormSchema.safeParse({ ...company, website: 'no url' }).success).toBe(false);
  });
});

describe('clientFormSchema', () => {
  it('exige correo válido y nombres', () => {
    const base = {
      firstName: 'Ana',
      lastName: 'López',
      email: 'ana@acme.com',
      phone: '',
      jobTitle: '',
      companyId: '',
      status: 'ACTIVE' as const,
      notes: '',
    };
    expect(clientFormSchema.safeParse(base).success).toBe(true);
    expect(clientFormSchema.safeParse({ ...base, email: 'x' }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...base, firstName: '' }).success).toBe(false);
  });
});

describe('opportunityFormSchema', () => {
  const base = {
    name: 'Renovación anual',
    description: '',
    companyId: 'company-id',
    clientId: 'client-id',
    ownerId: '',
    value: '1000',
    probability: '50',
    expectedCloseDate: '',
    stage: 'PROSPECTO' as const,
  };

  it('acepta importes positivos y probabilidad entera', () => {
    expect(opportunityFormSchema.safeParse(base).success).toBe(true);
  });

  it('exige empresa y cliente', () => {
    expect(opportunityFormSchema.safeParse({ ...base, companyId: '' }).success).toBe(false);
    expect(opportunityFormSchema.safeParse({ ...base, clientId: '' }).success).toBe(false);
  });

  it('rechaza importes no numéricos o no positivos', () => {
    expect(opportunityFormSchema.safeParse({ ...base, value: 'abc' }).success).toBe(false);
    expect(opportunityFormSchema.safeParse({ ...base, value: '0' }).success).toBe(false);
  });

  it('rechaza probabilidades fuera de rango o decimales', () => {
    expect(opportunityFormSchema.safeParse({ ...base, probability: '101' }).success).toBe(false);
    expect(opportunityFormSchema.safeParse({ ...base, probability: '50.5' }).success).toBe(false);
  });

  it('valida la fecha estimada opcional', () => {
    expect(
      opportunityFormSchema.safeParse({ ...base, expectedCloseDate: '2026-12-31' }).success,
    ).toBe(true);
    expect(
      opportunityFormSchema.safeParse({ ...base, expectedCloseDate: '31/12/2026' }).success,
    ).toBe(false);
  });
});

describe('saleFormSchema', () => {
  it('normaliza la moneda a mayúsculas', () => {
    const parsed = saleFormSchema.parse(sale);
    expect(parsed.currency).toBe('GTQ');
  });

  it('rechaza fechas con formato incorrecto y montos inválidos', () => {
    expect(saleFormSchema.safeParse({ ...sale, saleDate: '30-10-2026' }).success).toBe(false);
    expect(saleFormSchema.safeParse({ ...sale, amount: '0' }).success).toBe(false);
    expect(saleFormSchema.safeParse({ ...sale, amount: '-5' }).success).toBe(false);
  });

  it('rechaza códigos de moneda que no sean ISO de 3 letras', () => {
    expect(saleFormSchema.safeParse({ ...sale, currency: 'US' }).success).toBe(false);
  });
});

describe('userCreateSchema', () => {
  it('aplica el rol vendedor y estado activo por defecto', () => {
    const parsed = userCreateSchema.parse({
      name: 'Ana López',
      email: 'ana@acme.com',
      password: 'ClaveSegura123',
      role: 'VENDEDOR',
      status: 'ACTIVE',
      mustChangePassword: true,
    });
    expect(parsed.role).toBe('VENDEDOR');
  });
});

describe('changePasswordSchema', () => {
  it('exige que la confirmación coincida', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Actual12345',
      newPassword: 'NuevaClave123',
      confirmPassword: 'OtraClave123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('acepta contraseñas coincidentes y seguras', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'Actual12345',
        newPassword: 'NuevaClave123',
        confirmPassword: 'NuevaClave123',
      }).success,
    ).toBe(true);
  });
});

describe('emptyToNull', () => {
  it('convierte cadenas vacías o espacios en null', () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull('   ')).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull(' valor ')).toBe('valor');
  });
});
