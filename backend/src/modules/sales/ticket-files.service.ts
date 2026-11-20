import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

const ticketFileSelect = {
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
} satisfies Prisma.TicketFileSelect;

const findTicketSale = async (saleId: string) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true, hasTicket: true },
  });
  if (!sale) throw new NotFoundError('La venta no existe');
  if (!sale.hasTicket) {
    throw new BadRequestError('Esta venta no tiene un ticket asociado');
  }
  return sale;
};

export const listTicketComments = async (saleId: string) => {
  await findTicketSale(saleId);
  return prisma.ticketComment.findMany({
    where: { saleId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: ticketFileSelect },
    },
  });
};

export const createTicketComment = async (
  saleId: string,
  body: string,
  fileIds: string[],
  actor: User,
) => {
  const sale = await findTicketSale(saleId);

  if (new Set(fileIds).size !== fileIds.length) {
    throw new BadRequestError('No puedes adjuntar el mismo archivo más de una vez');
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketComment.create({
      data: { saleId, authorId: actor.id, body },
    });

    if (fileIds.length) {
      const attached = await tx.ticketFile.updateMany({
        where: {
          saleId,
          commentId: null,
          id: { in: fileIds },
        },
        data: { commentId: created.id },
      });
      if (attached.count !== fileIds.length) {
        throw new BadRequestError(
          'Uno o más archivos ya fueron adjuntados o no pertenecen a este ticket',
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
    description: `Comentario agregado al ticket de la venta: ${sale.id}`,
    metadata: { ticketCommentId: comment.id, attachments: fileIds.length },
  });

  return prisma.ticketComment.findUniqueOrThrow({
    where: { id: comment.id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: ticketFileSelect },
    },
  });
};

export const uploadTicketFile = async (
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
  const sale = await findTicketSale(saleId);
  const created = await prisma.ticketFile.create({
    data: {
      saleId,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      data: new Uint8Array(file.data),
      uploadedById: actor.id,
    },
    select: ticketFileSelect,
  });

  await logActivity({
    userId: actor.id,
    action: 'UPLOAD',
    entityType: 'SALE',
    entityId: sale.id,
    description: `Archivo adjuntado al ticket: ${created.originalName}`,
    metadata: { ticketFileId: created.id },
  });

  return created;
};

export const getTicketFileForDownload = async (saleId: string, fileId: string) => {
  const file = await prisma.ticketFile.findFirst({
    where: { id: fileId, saleId },
    select: {
      originalName: true,
      mimeType: true,
      size: true,
      data: true,
    },
  });
  if (!file) throw new NotFoundError('El archivo no existe en este ticket');
  return file;
};

export const deleteTicketFile = async (
  saleId: string,
  fileId: string,
  actor: User,
) => {
  const file = await prisma.ticketFile.findFirst({
    where: { id: fileId, saleId },
    select: { id: true, uploadedById: true, originalName: true },
  });
  if (!file) throw new NotFoundError('El archivo no existe en este ticket');
  if (actor.role !== 'ADMIN' && file.uploadedById !== actor.id) {
    throw new ForbiddenError('Solo puedes eliminar los archivos que subiste tú');
  }

  await prisma.ticketFile.delete({ where: { id: fileId } });

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'SALE',
    entityId: saleId,
    description: `Archivo eliminado del ticket: ${file.originalName}`,
    metadata: { ticketFileId: fileId },
  });
};
