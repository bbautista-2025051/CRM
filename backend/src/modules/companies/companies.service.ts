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

const companyFileSelect = {
  id: true,
  companyId: true,
  commentId: true,
  originalName: true,
  storedName: true,
  mimeType: true,
  size: true,
  uploadedById: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.CompanyFileSelect;

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

// ---------------------------------------------------------------------------
// Comentarios de la empresa
// ---------------------------------------------------------------------------

export const listCompanyComments = async (companyId: string) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('La empresa no existe');

  return prisma.companyComment.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: companyFileSelect },
    },
  });
};

export const createCompanyComment = async (
  companyId: string,
  body: string,
  fileIds: string[],
  actor: User,
) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('La empresa no existe');

  const comment = await prisma.companyComment.create({
    data: {
      companyId,
      authorId: actor.id,
      body,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (fileIds.length) {
    await prisma.companyFile.updateMany({
      where: { companyId, commentId: null, id: { in: fileIds } },
      data: { commentId: comment.id },
    });
  }

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'COMPANY',
    entityId: companyId,
    description: `Comentario agregado a la empresa: ${company.name}`,
    metadata: { commentId: comment.id, attachments: fileIds.length },
  });

  return getCompanyComment(comment.id);
};

const getCompanyComment = (id: string) =>
  prisma.companyComment.findUniqueOrThrow({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: companyFileSelect },
    },
  });

// ---------------------------------------------------------------------------
// Archivos de la empresa
// ---------------------------------------------------------------------------

export const listCompanyFiles = async (companyId: string) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('La empresa no existe');

  return prisma.companyFile.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: companyFileSelect,
  });
};

export const uploadCompanyFile = async (
  companyId: string,
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    data: Buffer;
  },
  actor: User,
) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new NotFoundError('La empresa no existe');
  }

  const created = await prisma.companyFile.create({
    data: {
      companyId,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      data: new Uint8Array(file.data),
      uploadedById: actor.id,
    },
    select: companyFileSelect,
  });

  await logActivity({
    userId: actor.id,
    action: 'UPLOAD',
    entityType: 'COMPANY',
    entityId: companyId,
    description: `Archivo subido a la empresa ${company.name}: ${created.originalName}`,
    metadata: { fileId: created.id, storedName: created.storedName },
  });

  return created;
};

export const getCompanyFileForDownload = async (companyId: string, fileId: string) => {
  const file = await prisma.companyFile.findFirst({
    where: { id: fileId, companyId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      storedName: true,
      data: true,
    },
  });
  if (!file) {
    throw new NotFoundError('El archivo no existe en esta empresa');
  }

  if (!file.data) {
    throw new NotFoundError('El contenido del archivo no está disponible');
  }

  return { ...file, data: file.data };
};

export const deleteCompanyFile = async (
  companyId: string,
  fileId: string,
  actor: User,
) => {
  const file = await prisma.companyFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      companyId: true,
      uploadedById: true,
      storedName: true,
      originalName: true,
    },
  });
  if (!file || file.companyId !== companyId) {
    throw new NotFoundError('El archivo no existe en esta empresa');
  }

  const isOwner = file.uploadedById === actor.id;
  if (actor.role !== 'ADMIN' && !isOwner) {
    throw new ForbiddenError('Solo puedes eliminar los archivos que subiste tú');
  }

  await prisma.companyFile.delete({ where: { id: fileId } });

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'COMPANY',
    entityId: companyId,
    description: `Archivo eliminado de la empresa: ${file.originalName}`,
    metadata: { fileId },
  });
};
