import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { readProjectFile, removeProjectFile } from '../../middlewares/upload';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

const saleFileSelect = {
  id: true,
  saleId: true,
  commentId: true,
  originalName: true,
  storedName: true,
  mimeType: true,
  size: true,
  uploadedById: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.SaleFileSelect;

const linkedProjectFileSelect = {
  id: true,
  projectId: true,
  commentId: true,
  originalName: true,
  storedName: true,
  mimeType: true,
  size: true,
  uploadedById: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ProjectFileSelect;

const findSale = async (saleId: string) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      opportunity: {
        select: {
          project: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!sale) throw new NotFoundError('La venta no existe');
  return sale;
};

export const listSaleComments = async (saleId: string) => {
  const sale = await findSale(saleId);
  const linkedProjectId = sale.opportunity?.project?.id;

  const [saleComments, projectComments] = await Promise.all([
    prisma.saleComment.findMany({
      where: { saleId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        files: { select: saleFileSelect },
      },
    }),
    linkedProjectId
      ? prisma.projectComment.findMany({
          where: { projectId: linkedProjectId },
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            files: { select: linkedProjectFileSelect },
          },
        })
      : Promise.resolve([]),
  ]);

  if (!projectComments.length) {
    return saleComments;
  }

  const mappedProjectComments = projectComments.map(({ projectId: _projectId, files, ...comment }) => ({
    ...comment,
    saleId,
    files: files.map(({ projectId: _fileProjectId, ...file }) => ({
      ...file,
      saleId,
    })),
  }));

  return [...saleComments, ...mappedProjectComments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
};

export const createSaleComment = async (
  saleId: string,
  body: string,
  fileIds: string[],
  actor: User,
) => {
  const sale = await findSale(saleId);

  if (new Set(fileIds).size !== fileIds.length) {
    throw new BadRequestError('No puedes adjuntar el mismo archivo más de una vez');
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.saleComment.create({
      data: { saleId, authorId: actor.id, body },
    });

    if (fileIds.length) {
      const attached = await tx.saleFile.updateMany({
        where: {
          saleId,
          commentId: null,
          id: { in: fileIds },
        },
        data: { commentId: created.id },
      });
      if (attached.count !== fileIds.length) {
        throw new BadRequestError(
          'Uno o más archivos ya fueron adjuntados o no pertenecen a esta venta',
        );
      }
    }

    return created;
  });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'SALE',
    entityId: sale.id,
    description: `Comentario agregado a la venta: ${sale.id}`,
    metadata: { commentId: comment.id, attachments: fileIds.length },
  });

  return prisma.saleComment.findUniqueOrThrow({
    where: { id: comment.id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: saleFileSelect },
    },
  });
};

export const uploadSaleFile = async (
  saleId: string,
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    data: Buffer;
  },
  actor: User,
) => {
  const sale = await findSale(saleId);
  const created = await prisma.saleFile.create({
    data: {
      saleId,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      data: new Uint8Array(file.data),
      uploadedById: actor.id,
    },
    select: saleFileSelect,
  });

  await logActivity({
    userId: actor.id,
    action: 'UPLOAD',
    entityType: 'SALE',
    entityId: sale.id,
    description: `Archivo adjuntado a la venta: ${created.originalName}`,
    metadata: { fileId: created.id },
  });

  return created;
};

export const getFileForDownload = async (saleId: string, fileId: string) => {
  const file = await prisma.saleFile.findFirst({
    where: { id: fileId, saleId },
    select: {
      originalName: true,
      mimeType: true,
      size: true,
      data: true,
    },
  });
  if (file) return file;

  const sale = await findSale(saleId);
  const linkedProjectId = sale.opportunity?.project?.id;
  if (linkedProjectId) {
    const projectFile = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId: linkedProjectId },
      select: {
        originalName: true,
        mimeType: true,
        size: true,
        storedName: true,
        data: true,
      },
    });
    if (projectFile) {
      const data = projectFile.data ?? (await readProjectFile(projectFile.storedName));
      if (!data) {
        throw new NotFoundError(
          'Este archivo se subió antes de habilitar el almacenamiento en la base de datos y ya no está disponible. Vuelve a subirlo.',
        );
      }
      return {
        originalName: projectFile.originalName,
        mimeType: projectFile.mimeType,
        size: projectFile.size,
        data,
      };
    }
  }

  throw new NotFoundError('El archivo no existe en esta venta');
};

export const deleteFile = async (saleId: string, fileId: string, actor: User) => {
  const file = await prisma.saleFile.findFirst({
    where: { id: fileId, saleId },
    select: { id: true, uploadedById: true, originalName: true },
  });
  if (file) {
    if (actor.role !== 'ADMIN' && file.uploadedById !== actor.id) {
      throw new ForbiddenError('Solo puedes eliminar los archivos que subiste tú');
    }

    await prisma.saleFile.delete({ where: { id: fileId } });

    await logActivity({
      userId: actor.id,
      action: 'DELETE',
      entityType: 'SALE',
      entityId: saleId,
      description: `Archivo eliminado de la venta: ${file.originalName}`,
      metadata: { fileId },
    });
    return;
  }

  const sale = await findSale(saleId);
  const linkedProjectId = sale.opportunity?.project?.id;
  if (linkedProjectId) {
    const projectFile = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId: linkedProjectId },
      select: { id: true, uploadedById: true, originalName: true, storedName: true },
    });
    if (projectFile) {
      if (actor.role !== 'ADMIN' && projectFile.uploadedById !== actor.id) {
        throw new ForbiddenError('Solo puedes eliminar los archivos que subiste tú');
      }

      await prisma.projectFile.delete({ where: { id: fileId } });
      removeProjectFile(projectFile.storedName);

      await logActivity({
        userId: actor.id,
        action: 'DELETE',
        entityType: 'PROJECT',
        entityId: linkedProjectId,
        description: `Archivo eliminado del proyecto: ${projectFile.originalName}`,
        metadata: { fileId, fromSaleId: saleId },
      });
      return;
    }
  }

  throw new NotFoundError('El archivo no existe en esta venta');
};