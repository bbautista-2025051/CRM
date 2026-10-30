import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  fullName,
  initials,
  todayISO,
  truncate,
} from './format';

describe('formatMoney', () => {
  it('conserva la precisión de importes grandes sin usar Number', () => {
    const formatted = formatMoney('123456789012345.678', 'USD');
    expect(formatted).toContain('123.456.789.012.345,67');
  });

  it('agrupa miles y usa coma decimal', () => {
    expect(formatMoney('1234567.8', 'COP')).toContain('1.234.567,80');
  });

  it('antepone el signo negativo', () => {
    expect(formatMoney('-2500.5', 'EUR').startsWith('-')).toBe(true);
  });

  it('rellena decimales faltantes', () => {
    expect(formatMoney('10', 'USD')).toContain('10,00');
  });

  it('devuelve un guion para valores vacíos', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('')).toBe('—');
  });
});

describe('formatNumber / formatPercent', () => {
  it('formatea números con separadores locales', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('formatea porcentajes con un decimal', () => {
    expect(formatPercent(12.34)).toBe('12,3%');
    expect(formatPercent(null)).toBe('—');
  });
});

describe('fechas', () => {
  it('formatea una fecha ISO sin desplazamiento de zona', () => {
    const formatted = formatDate('2026-10-30');
    expect(formatted).toContain('30');
    expect(formatted).toContain('2026');
  });

  it('trata las columnas de fecha sin hora como fecha civil', () => {
    // El API serializa las columnas DATE como ISO a medianoche UTC; en zonas
    // horarias negativas eso no debe restar un día al mostrarlas.
    expect(formatDate('2026-12-15T00:00:00.000Z')).toBe(formatDate('2026-12-15'));
    expect(formatDate('2026-12-15T00:00:00.000Z')).toContain('15');
  });

  it('devuelve un guion para fechas inválidas', () => {
    expect(formatDate('no-es-fecha')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime('invalid')).toBe('—');
  });

  it('genera la fecha de hoy en formato AAAA-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('texto', () => {
  it('calcula iniciales con un máximo de dos letras', () => {
    expect(initials('Ana María López')).toBe('AM');
    expect(initials('  ')).toBe('?');
  });

  it('une nombre y apellido', () => {
    expect(fullName({ firstName: 'Ana', lastName: 'López' })).toBe('Ana López');
    expect(fullName(null)).toBe('—');
  });

  it('trunca textos largos', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
    expect(truncate('abc', 5)).toBe('abc');
  });
});
