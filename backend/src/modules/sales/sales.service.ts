import {
  Prisma,
  type Sale,
  type SaleStatus,
  type User,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import {
  buildOrderBy,
  buildPaginationMeta,
  skipTake,
} from '../../utils/pagination';

const isAdmin = (role: string) => role === 'ADMIN';
const isGerente = (role: string) => role === 'GERENTE';
const isVendedor = (role: string) => role === 'VENDEDOR';
const isPreventa = (role: string) => role === 'PREVENTA';
const isOperaciones = (role: string) => role === 'OPERACIONES';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: SaleStatus;
  ownerId?: string;
  clientId?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

const SORTABLE = [
  'saleNumber',
  'saleDate',
  'amount',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export const listSales = async (params: ListParams) => {
  const where: Prisma.SaleWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.clientId ? { clientId: params.clientId } : {}),
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(params.search
      ? {
          OR: [
            { saleNumber: { contains: params.search, mode: 'insensitive' } },
            {
              client: {
                OR: [
                  { firstName: { contains: params.search, mode: 'insensitive' } },
                  { lastName: { contains: params.search, mode: 'insensitive' } },
                  { email: { contains: params.search, mode: 'insensitive' } },
                ],
              },
            },
            {
              company: { name: { contains: params.search, mode: 'insensitive' } },
            },
          ],
        }
      : {}),
    ...(params.dateFrom || params.dateTo
      ? {
          saleDate: {
            ...(params.dateFrom
              ? { gte: new Date(`${params.dateFrom}T00:00:00.000Z`) }
              : {}),
            ...(params.dateTo
              ? { lte: new Date(`${params.dateTo}T00:00:00.000Z`) }
              : {}),
          },
        }
      : {}),
  };

  const [total, sales] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: buildOrderBy(params.sortBy, SORTABLE, params.sortOrder, 'saleDate'),
      ...skipTake(params.page, params.pageSize),
      include: {
        company: { select: { id: true, name: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        opportunity: { select: { id: true, name: true, stage: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    data: sales,
    meta: buildPaginationMeta(total, params.page, params.pageSize),
  };
};

export const getSale = async (id: string) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      company: true,
      client: true,
      opportunity: {
        select: {
          id: true,
          name: true,
          stage: true,
          status: true,
          value: true,
          owner: { select: { id: true, name: true } },
        },
      },
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
  if (!sale) throw new NotFoundError('La venta no existe');
  return sale;
};

export const getSalesSummary = async (
  dateFrom?: string,
  dateTo?: string,
  ownerId?: string,
) => {
  const where: Prisma.SaleWhereInput = {
    ...(ownerId ? { ownerId } : {}),
    ...(dateFrom || dateTo
      ? {
          saleDate: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T00:00:00.000Z`) } : {}),
          },
        }
      : {}),
  };

  const grouped = await prisma.sale.groupBy({
    by: ['status', 'currency'],
    where,
    _count: { _all: true },
    _sum: { amount: true },
  });

  const byCurrency = new Map<
    string,
    { currency: string; confirmedTotal: string; confirmedCount: number }
  >();
  const counts: Record<SaleStatus, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
  };

  for (const row of grouped) {
    counts[row.status] += row._count._all;
    if (row.status === 'CONFIRMED') {
      const current = byCurrency.get(row.currency) ?? {
        currency: row.currency,
        confirmedTotal: '0',
        confirmedCount: 0,
      };
      current.confirmedTotal = (
        Number(current.confirmedTotal) + Number(row._sum.amount ?? 0)
      ).toFixed(2);
      current.confirmedCount += row._count._all;
      byCurrency.set(row.currency, current);
    }
  }

  return {
    counts,
    total: counts.PENDING + counts.CONFIRMED + counts.CANCELLED,
    byCurrency: [...byCurrency.values()].sort((a, b) =>
      a.currency.localeCompare(b.currency),
    ),
  };
};

export const generateSaleNumber = async (tx: Prisma.TransactionClient): Promise<string> => {
  const rows = await tx.$queryRaw<Array<{ seq: number }>>`
    SELECT nextval('sale_number_seq')::int AS seq
  `;
  const seq = rows[0]?.seq ?? 1;
  const year = new Date().getUTCFullYear();
  return `V-${year}-${String(seq).padStart(5, '0')}`;
};

interface SaleInput {
  companyId: string | null;
  clientId: string | null;
  opportunityId: string | null;
  ownerId?: string;
  saleDate: Date;
  amount: string;
  currency: string;
  status: SaleStatus;
  notes: string | null;
}

interface ResolvedRelations {
  companyId: string | null;
  clientId: string | null;
  opportunityId: string | null;
  ownerId: string;
}

const resolveRelations = async (
  input: Pick<SaleInput, 'companyId' | 'clientId' | 'opportunityId' | 'ownerId'>,
  actor: User,
): Promise<ResolvedRelations> => {
  let companyId = input.companyId;
  let clientId = input.clientId;
  let opportunityId = input.opportunityId;
  let ownerId = input.ownerId ?? actor.id;

  if (actor.role !== 'ADMIN' && ownerId !== actor.id) {
    throw new ForbiddenError('Solo un administrador puede asignar ventas a otro responsable');
  }

  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner || owner.status !== 'ACTIVE') {
    throw new BadRequestError('El responsable seleccionado no está disponible');
  }

  if (opportunityId) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { sale: { select: { saleNumber: true } } },
    });
    if (!opportunity) throw new BadRequestError('La oportunidad seleccionada no existe');
    if (opportunity.stage !== 'GANADA') {
      throw new BadRequestError(
        'Solo se puede registrar una venta para una oportunidad ganada',
      );
    }
    if (opportunity.sale) {
      throw new ConflictError(
        `La oportunidad ya tiene la venta ${opportunity.sale.saleNumber} asociada`,
      );
    }
    if (actor.role !== 'ADMIN' && opportunity.ownerId !== actor.id) {
      throw new ForbiddenError(
        'Solo puedes registrar ventas de oportunidades que tienes asignadas',
      );
    }

    if (companyId && opportunity.companyId && companyId !== opportunity.companyId) {
      throw new BadRequestError('La empresa no coincide con la de la oportunidad');
    }
    if (clientId && opportunity.clientId && clientId !== opportunity.clientId) {
      throw new BadRequestError('El cliente no coincide con el de la oportunidad');
    }

    companyId = opportunity.companyId ?? companyId;
    clientId = opportunity.clientId ?? clientId;
    ownerId = opportunity.ownerId;
  }

  if (!clientId) {
    throw new BadRequestError(
      'Selecciona un cliente o una oportunidad ganada para registrar la venta',
    );
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new BadRequestError('El cliente seleccionado no existe');
  if (client.status === 'ARCHIVED') {
    throw new BadRequestError('No puedes registrar una venta para un cliente archivado');
  }

  if (companyId && client.companyId && companyId !== client.companyId) {
    throw new BadRequestError('El cliente no pertenece a la empresa seleccionada');
  }
  companyId = companyId ?? client.companyId;

  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestError('La empresa seleccionada no existe');
    if (company.status === 'ARCHIVED') {
      throw new BadRequestError('No puedes registrar una venta para una empresa archivada');
    }
  }

  return { companyId, clientId, opportunityId, ownerId };
};

export const createSale = async (input: SaleInput, actor: User) => {
  // Vendedor/Preventa/Operations pueden crear ventas con estado PENDING
  // Solo ADMIN puede crear una venta con estado CONFIRMED directamente
  if (input.status === 'CONFIRMED' && !isAdmin(actor.role)) {
    throw new ForbiddenError(
      'Solo un administrador puede crear una venta con estado CONFIRMED',
    );
  }
  // Vendedores/Preventa/Operations crean con PENDING por defecto
  if (!input.status) input.status = 'PENDING';

  const relations = await resolveRelations(input, actor);

  const sale = await prisma.$transaction(
    async (tx) => {
      const saleNumber = await generateSaleNumber(tx);
      return tx.sale.create({
        data: {
          saleNumber,
          companyId: relations.companyId,
          clientId: relations.clientId,
          opportunityId: relations.opportunityId,
          ownerId: relations.ownerId,
          saleDate: input.saleDate,
          amount: input.amount,
          currency: input.currency,
          status: input.status,
          notes: input.notes,
        },
        include: {
          company: { select: { id: true, name: true } },
          client: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'SALE',
    entityId: sale.id,
    description: `Venta registrada: ${sale.saleNumber} por ${sale.amount.toString()} ${sale.currency}`,
    metadata: { status: sale.status },
  });

  return sale;
};

const assertCanManage = (sale: Sale, actor: User): void => {
  if (actor.role === 'ADMIN') return;
  if (sale.ownerId !== actor.id) {
    throw new ForbiddenError('Solo puedes gestionar las ventas que tienes asignadas');
  }
};

export const updateSale = async (
  id: string,
  input: {
    companyId?: string | null;
    clientId?: string | null;
    saleDate?: Date;
    amount?: string;
    currency?: string;
    status?: SaleStatus;
    notes?: string | null;
  },
  actor: User,
) => {
  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('La venta no existe');

  // ADMIN puede modificar cualquier venta
  if (isAdmin(actor.role)) {
    // Permitir todas las modificaciones
  } else if (isGerente(actor.role)) {
    // GERENTE puede editar ventas PENDING de su equipo
    // No puede modificar ventas CONFIRMED a menos que sea para corregir información menor
    if (existing.status === 'CONFIRMED') {
      throw new ForbiddenError(
        'Las ventas confirmadas solo pueden modificarse por un administrador',
      );
    }
  } else if (isVendedor(actor.role) || isPreventa(actor.role) || isOperaciones(actor.role)) {
    // Vendedores/Preventa/Operaciones solo pueden editar sus propias ventas PENDING
    if (existing.ownerId !== actor.id) {
      throw new ForbiddenError(
        'Solo puedes gestionar las ventas que tienes asignadas',
      );
    }
    if (existing.status !== 'PENDING') {
      throw new ForbiddenError(
        'Solo puedes editar ventas con estado PENDING',
      );
    }
  } else {
    throw new ForbiddenError('No tienes permiso para modificar esta venta');
  }

  if (existing.status === 'CANCELLED') {
    throw new ConflictError('Una venta cancelada no puede volver a cambiar de estado');
  }

  const companyId =
    input.companyId !== undefined ? input.companyId : existing.companyId;
  const clientId = input.clientId !== undefined ? input.clientId : existing.clientId;

  if (companyId || clientId) {
    const client = clientId
      ? await prisma.client.findUnique({ where: { id: clientId } })
      : null;
    if (clientId && !client) throw new BadRequestError('El cliente seleccionado no existe');
    if (client?.status === 'ARCHIVED') {
      throw new BadRequestError('No puedes asociar una venta a un cliente archivado');
    }
    if (companyId && client?.companyId && client.companyId !== companyId) {
      throw new BadRequestError('El cliente no pertenece a la empresa seleccionada');
    }
    if (companyId) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) throw new BadRequestError('La empresa seleccionada no existe');
    }
  }

  const sale = await prisma.sale.update({
    where: { id },
    data: {
      ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.saleDate !== undefined ? { saleDate: input.saleDate } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      owner: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });

  await logActivity({
    userId: actor.id,
    action: 'UPDATE',
    entityType: 'SALE',
    entityId: sale.id,
    description: `Venta actualizada: ${sale.saleNumber}`,
    metadata: input.status ? { status: input.status } : undefined,
  });

  return sale;
};

export const cancelSale = async (id: string, actor: User) => {
  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('La venta no existe');

  // ADMIN puede cancelar cualquier venta
  if (isAdmin(actor.role)) {
    // Permitir cancelación
  } else if (isGerente(actor.role)) {
    // GERENTE puede cancelar cualquier venta
  } else if (isVendedor(actor.role) || isPreventa(actor.role) || isOperaciones(actor.role)) {
    // Vendedores/Preventa/Operations solo pueden cancelar sus ventas PENDING
    if (existing.ownerId !== actor.id) {
      throw new ForbiddenError(
        'Solo puedes cancelar las ventas que tienes asignadas',
      );
    }
    if (existing.status !== 'PENDING') {
      throw new ForbiddenError(
        'Solo puedes cancelar ventas con estado PENDING',
      );
    }
  } else {
    throw new ForbiddenError('No tienes permiso para cancelar esta venta');
  }

  if (existing.status === 'CANCELLED') {
    throw new ConflictError('La venta ya está cancelada');
  }

  const sale = await prisma.sale.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  await logActivity({
    userId: actor.id,
    action: 'CANCEL',
    entityType: 'SALE',
    entityId: id,
    description: `Venta cancelada: ${existing.saleNumber}`,
    metadata: { previousStatus: existing.status },
  });

  return sale;
};
