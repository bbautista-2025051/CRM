import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import {
  buildOrderBy,
  buildPaginationMeta,
  skipTake,
  type PaginationMeta,
} from '../../utils/pagination';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  sector?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

const SORTABLE = ['name', 'sector', 'status', 'createdAt', 'updatedAt'] as const;

export const listCompanies = async (params: ListParams) => {
  const where: Prisma.CompanyWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.sector ? { sector: params.sector } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { legalName: { contains: params.search, mode: 'insensitive' } },
            { taxId: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, companies] = await prisma.$transaction([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: buildOrderBy(params.sortBy, SORTABLE, params.sortOrder, 'createdAt'),
      ...skipTake(params.page, params.pageSize),
      include: {
        _count: { select: { clients: true, opportunities: true, sales: true } },
      },
    }),
  ]);

  return {
    data: companies,
    meta: buildPaginationMeta(total, params.page, params.pageSize),
  };
};

export const getCompany = async (id: string) => {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      clients: {
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 100,
        include: { _count: { select: { opportunities: true, sales: true } } },
      },
      opportunities: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          sale: { select: { id: true, saleNumber: true, status: true } },
        },
      },
      sales: {
        orderBy: { saleDate: 'desc' },
        take: 100,
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          owner: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!company) throw new NotFoundError('La empresa no existe');
  return company;
};

export const getCompanyOptions = async (search?: string, limit = 50) => {
  return prisma.company.findMany({
    where: {
      status: 'ACTIVE',
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    select: { id: true, name: true, sector: true },
    orderBy: { name: 'asc' },
    take: limit,
  });
};

export const getSectors = async (): Promise<string[]> => {
  const rows = await prisma.company.findMany({
    where: { sector: { not: null } },
    select: { sector: true },
    distinct: ['sector'],
    orderBy: { sector: 'asc' },
  });
  return rows.map((row) => row.sector).filter((sector): sector is string => Boolean(sector));
};

interface CompanyInput {
  name: string;
  legalName: string | null;
  taxId: string | null;
  sector: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  notes: string | null;
}

export const createCompany = async (input: CompanyInput, actor: User) => {
  if (input.status === 'ARCHIVED' && actor.role !== 'ADMIN') {
    throw new ForbiddenError('Solo un administrador puede crear empresas archivadas');
  }

  const company = await prisma.company.create({
    data: { ...input, createdById: actor.id },
  });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'COMPANY',
    entityId: company.id,
    description: `Empresa creada: ${company.name}`,
  });

  return company;
};

export const updateCompany = async (
  id: string,
  input: Partial<CompanyInput>,
  actor: User,
) => {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('La empresa no existe');

  // El estado solo lo administra un ADMIN; de lo contrario un vendedor podría
  // archivar (o reactivar) empresas saltándose el endpoint protegido.
  if (
    input.status !== undefined &&
    input.status !== existing.status &&
    actor.role !== 'ADMIN'
  ) {
    throw new ForbiddenError('Solo un administrador puede cambiar el estado de una empresa');
  }

  const company = await prisma.company.update({
    where: { id },
    data: input,
  });

  await logActivity({
    userId: actor.id,
    action: 'UPDATE',
    entityType: 'COMPANY',
    entityId: company.id,
    description: `Empresa actualizada: ${company.name}`,
  });

  return company;
};

/**
 * Política de integridad: las empresas nunca se eliminan físicamente porque
 * pueden estar referenciadas por clientes, oportunidades y ventas. DELETE
 * aplica un archivado lógico y conserva todo el histórico.
 */
export const archiveCompany = async (id: string, actorId: string) => {
  const existing = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { clients: true, opportunities: true, sales: true } } },
  });
  if (!existing) throw new NotFoundError('La empresa no existe');

  if (existing.status === 'ARCHIVED') {
    return { company: existing, alreadyArchived: true };
  }

  const company = await prisma.company.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  await logActivity({
    userId: actorId,
    action: 'ARCHIVE',
    entityType: 'COMPANY',
    entityId: id,
    description: `Empresa archivada: ${existing.name}`,
    metadata: {
      clients: existing._count.clients,
      opportunities: existing._count.opportunities,
      sales: existing._count.sales,
    },
  });

  return { company, alreadyArchived: false };
};
