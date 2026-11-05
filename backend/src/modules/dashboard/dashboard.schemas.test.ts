import { describe, expect, it } from 'vitest';
import { dashboardQuerySchema } from './dashboard.schemas';

describe('dashboardQuerySchema', () => {
  it('acepta los filtros soportados y valores válidos', () => {
    expect(
      dashboardQuerySchema.safeParse({
        role: 'VENDEDOR',
        userId: '51e5d7a4-4df5-4e88-bf60-5b21d6fdb1bd',
        month: '12',
        year: '2026',
      }).success,
    ).toBe(true);
  });

  it('acepta el valor especial para todos los meses', () => {
    expect(dashboardQuerySchema.safeParse({ month: 'all' }).success).toBe(true);
  });

  it('rechaza roles no soportados, UUID inválido y rangos de fecha incorrectos', () => {
    expect(dashboardQuerySchema.safeParse({ role: 'GERENTE' }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ userId: 'no-es-uuid' }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ month: '13' }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ year: '9999' }).success).toBe(false);
  });
});
