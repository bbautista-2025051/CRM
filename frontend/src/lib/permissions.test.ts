import { describe, expect, it } from 'vitest';
import {
  canArchive,
  canCancelSale,
  canConfirmSales,
  canDeleteOpportunity,
  canEditSale,
  canEditProjectFields,
  canManageOpportunity,
  canManageSale,
  canManageUsers,
  isAdmin,
} from './permissions';

const ADMIN = 'user-admin';
const VENDOR = 'user-vendor';
const OTHER = 'user-other';

describe('permisos de administrador', () => {
  it('reconoce solo el rol ADMIN', () => {
    expect(isAdmin('ADMIN')).toBe(true);
    expect(isAdmin('VENDEDOR')).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('concentra las acciones sensibles en ADMIN', () => {
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canArchive('ADMIN')).toBe(true);
    expect(canConfirmSales('ADMIN')).toBe(true);
    expect(canManageUsers('VENDEDOR')).toBe(false);
    expect(canArchive('VENDEDOR')).toBe(false);
    expect(canConfirmSales('VENDEDOR')).toBe(false);
  });
});

describe('oportunidades', () => {
  it('permite gestionar al propietario o a un administrador', () => {
    expect(canManageOpportunity('VENDEDOR', VENDOR, VENDOR)).toBe(true);
    expect(canManageOpportunity('VENDEDOR', OTHER, VENDOR)).toBe(false);
    expect(canManageOpportunity('ADMIN', OTHER, VENDOR)).toBe(true);
    expect(canManageOpportunity(undefined, undefined, VENDOR)).toBe(false);
  });

  it('impide eliminar oportunidades con venta asociada', () => {
    expect(canDeleteOpportunity('ADMIN', ADMIN, VENDOR, false)).toBe(true);
    expect(canDeleteOpportunity('ADMIN', ADMIN, VENDOR, true)).toBe(false);
    expect(canDeleteOpportunity('VENDEDOR', VENDOR, VENDOR, true)).toBe(false);
  });
});

describe('ventas', () => {
  it('permite gestionar al propietario o a un administrador', () => {
    expect(canManageSale('VENDEDOR', VENDOR, VENDOR)).toBe(true);
    expect(canManageSale('VENDEDOR', OTHER, VENDOR)).toBe(false);
    expect(canManageSale('ADMIN', OTHER, VENDOR)).toBe(true);
  });

  describe('proyectos', () => {
    it('permite editar datos al administrador o al vendedor asignado', () => {
      expect(canEditProjectFields('ADMIN', OTHER, VENDOR)).toBe(true);
      expect(canEditProjectFields('VENDEDOR', VENDOR, VENDOR)).toBe(true);
      expect(canEditProjectFields('VENDEDOR', OTHER, VENDOR)).toBe(false);
      expect(canEditProjectFields('GERENTE', VENDOR, VENDOR)).toBe(false);
      expect(canEditProjectFields(undefined, undefined, VENDOR)).toBe(false);
    });
  });

  it('solo deja editar pendientes al vendedor propietario', () => {
    expect(canEditSale('VENDEDOR', VENDOR, VENDOR, 'PENDING')).toBe(true);
    expect(canEditSale('VENDEDOR', VENDOR, VENDOR, 'CONFIRMED')).toBe(false);
    expect(canEditSale('VENDEDOR', OTHER, VENDOR, 'PENDING')).toBe(false);
    expect(canEditSale('ADMIN', OTHER, VENDOR, 'CONFIRMED')).toBe(true);
  });

  it('nunca permite editar ni cancelar una venta cancelada', () => {
    expect(canEditSale('ADMIN', ADMIN, VENDOR, 'CANCELLED')).toBe(false);
    expect(canCancelSale('ADMIN', ADMIN, VENDOR, 'CANCELLED')).toBe(false);
  });

  it('solo deja cancelar pendientes al vendedor propietario', () => {
    expect(canCancelSale('VENDEDOR', VENDOR, VENDOR, 'PENDING')).toBe(true);
    expect(canCancelSale('VENDEDOR', VENDOR, VENDOR, 'CONFIRMED')).toBe(false);
    expect(canCancelSale('ADMIN', ADMIN, VENDOR, 'CONFIRMED')).toBe(true);
  });
});
