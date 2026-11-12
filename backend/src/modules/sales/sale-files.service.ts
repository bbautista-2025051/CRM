import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
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

const findSale = async (saleId: string) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!sale) throw new NotFoundError('La venta no existe');
  return sale;
};

export const listSaleComments = async (saleId: string) => {
  await findSale(saleId);
  return prisma.saleComment.findMany({
    where: { saleId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: saleFileSelect },
    },
  });
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
  if (!file) throw new NotFoundError('El archivo no existe en esta venta');
  return file;
};

export const deleteFile = async (saleId: string, fileId: string, actor: User) => {
  const file = await prisma.saleFile.findFirst({
    where: { id: fileId, saleId },
    select: { id: true, uploadedById: true, originalName: true },
  });
  if (!file) throw new NotFoundError('El archivo no existe en esta venta');
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
};