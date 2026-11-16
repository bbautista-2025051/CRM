import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';

const BUILT_IN_STATUSES = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'CANCELLED', label: 'Cancelada' },
] as const;

const isBuiltInStatus = (value: string) =>
  BUILT_IN_STATUSES.some((s) => s.value === value || s.label.toLowerCase() === value.toLowerCase());

export const listSaleStatuses = () => {
  return prisma.customSaleStatus.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
};

export const createSaleStatus = async (name: string, actor: User) => {
  const normalizedName = name.trim();
  const normalizedKey = normalizedName.toLowerCase();

  if (isBuiltInStatus(normalizedKey)) {
    throw new ConflictError('Ya existe un estado con ese nombre');
  }

  const existing = await prisma.customSaleStatus.findUnique({
    where: { normalizedName: normalizedKey },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError('Ya existe un estado con ese nombre');
  }

  try {
    const status = await prisma.customSaleStatus.create({
      data: { name: normalizedName, normalizedName: normalizedKey },
      select: { id: true, name: true },
    });

    await logActivity({
      userId: actor.id,
      action: 'CREATE',
      entityType: 'SALE_STATUS',
      entityId: status.id,
      description: `Estado de venta creado: ${status.name}`,
      metadata: { statusId: status.id },
    });

    return { value: status.id, label: status.name, isCustom: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictError('Ya existe un estado con ese nombre');
    }
    throw error;
  }
};

export const deleteSaleStatus = async (
  id: string,
  actor: User,
): Promise<{ id: string; name: string }> => {
  if (isBuiltInStatus(id)) {
    throw new BadRequestError('No se puede eliminar un estado predeterminado');
  }

  const status = await prisma.customSaleStatus.findUnique({ where: { id } });
  if (!status) throw new NotFoundError('El estado no existe');

  const inUse = await prisma.sale.findFirst({
    where: { status: id as any },
    select: { id: true, saleNumber: true },
  });
  if (inUse) {
    throw new ConflictError(
      `No se puede eliminar el estado porque está en uso por la venta "${inUse.saleNumber}".`,
    );
  }

  await prisma.customSaleStatus.delete({ where: { id } });

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'SALE_STATUS',
    entityId: id,
    description: `Estado de venta eliminado: ${status.name}`,
    metadata: { statusId: id },
  });

  return { id: status.id, name: status.name };
};
