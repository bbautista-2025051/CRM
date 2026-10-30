import { Prisma, type User } from '@prisma/client';
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

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  companyId?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

const SORTABLE = [
  'firstName',
  'lastName',
  'email',
  'status',
  'createdAt',
  'updatedAt',
] as const;

const ensureCompanyExists = async (companyId: string | null): Promise<void> => {
  if (!companyId) return;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new BadRequestError('La empresa seleccionada no existe');
  if (company.status === 'ARCHIVED') {
    throw new BadRequestError('No puedes asociar un cliente a una empresa archivada');
  }
};

export const listClients = async (params: ListParams) => {
  const where: Prisma.ClientWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(params.search
      ? {
          OR: [
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, clients] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: buildOrderBy(params.sortBy, SORTABLE, params.sortOrder, 'createdAt'),
      ...skipTake(params.page, params.pageSize),
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { opportunities: true, sales: true } },
      },
    }),
  ]);

  return {
    data: clients,
    meta: buildPaginationMeta(total, params.page, params.pageSize),
  };
};

export const getClient = async (id: string) => {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      company: true,
      opportunities: {
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true } },
          sale: { select: { id: true, saleNumber: true, status: true } },
        },
      },
      sales: {
        orderBy: { saleDate: 'desc' },
        include: { owner: { select: { id: true, name: true } } },
      },
    },
  });

  if (!client) throw new NotFoundError('El cliente no existe');
  return client;
};

export const getClientOptions = async (
  search?: string,
  companyId?: string,
  limit = 50,
) => {
  return prisma.client.findMany({
    where: {
      status: 'ACTIVE',
      ...(companyId ? { companyId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      companyId: true,
      company: { select: { name: true } },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: limit,
  });
};

interface ClientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  companyId: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  notes: string | null;
}

export const createClient = async (input: ClientInput, actor: User) => {
  await ensureCompanyExists(input.companyId);

  if (input.status === 'ARCHIVED' && actor.role !== 'ADMIN') {
    throw new ForbiddenError('Solo un administrador puede crear clientes archivados');
  }

  const duplicate = await prisma.client.findUnique({ where: { email: input.email } });
  if (duplicate) {
    throw new ConflictError(
      `Ya existe un cliente registrado con el correo ${input.email}`,
    );
  }

  const client = await prisma.client.create({ data: input });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'CLIENT',
    entityId: client.id,
    description: `Cliente creado: ${client.firstName} ${client.lastName}`,
  });

  return client;
};

export const updateClient = async (
  id: string,
  input: Partial<ClientInput>,
  actor: User,
) => {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('El cliente no existe');

  if (
    input.status !== undefined &&
    input.status !== existing.status &&
    actor.role !== 'ADMIN'
  ) {
    throw new ForbiddenError('Solo un administrador puede cambiar el estado de un cliente');
  }

  if (input.companyId !== undefined) {
    await ensureCompanyExists(input.companyId);
  }

  if (input.email && input.email !== existing.email) {
    const duplicate = await prisma.client.findUnique({ where: { email: input.email } });
    if (duplicate) {
      throw new ConflictError(
        `Ya existe un cliente registrado con el correo ${input.email}`,
      );
    }
  }

  const client = await prisma.client.update({ where: { id }, data: input });

  await logActivity({
    userId: actor.id,
    action: 'UPDATE',
    entityType: 'CLIENT',
    entityId: client.id,
    description: `Cliente actualizado: ${client.firstName} ${client.lastName}`,
  });

  return client;
};

/** Archivado lógico para conservar oportunidades y ventas relacionadas. */
export const archiveClient = async (id: string, actorId: string) => {
  const existing = await prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { opportunities: true, sales: true } } },
  });
  if (!existing) throw new NotFoundError('El cliente no existe');

  if (existing.status === 'ARCHIVED') {
    return { client: existing, alreadyArchived: true };
  }

  const client = await prisma.client.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  await logActivity({
    userId: actorId,
    action: 'ARCHIVE',
    entityType: 'CLIENT',
    entityId: id,
    description: `Cliente archivado: ${existing.firstName} ${existing.lastName}`,
    metadata: {
      opportunities: existing._count.opportunities,
      sales: existing._count.sales,
    },
  });

  return { client, alreadyArchived: false };
};
