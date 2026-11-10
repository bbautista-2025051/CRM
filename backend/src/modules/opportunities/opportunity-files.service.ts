import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

const opportunityFileSelect = {
  id: true,
  opportunityId: true,
  commentId: true,
  originalName: true,
  storedName: true,
  mimeType: true,
  size: true,
  uploadedById: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.OpportunityFileSelect;

const findOpportunity = async (opportunityId: string) => {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: { id: true, name: true },
  });
  if (!opportunity) throw new NotFoundError('La oportunidad no existe');
  return opportunity;
};

export const listComments = async (opportunityId: string) => {
  await findOpportunity(opportunityId);
  return prisma.opportunityComment.findMany({
    where: { opportunityId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: opportunityFileSelect },
    },
  });
};

export const createComment = async (
  opportunityId: string,
  body: string,
  fileIds: string[],
  actor: User,
) => {
  const opportunity = await findOpportunity(opportunityId);
  if (new Set(fileIds).size !== fileIds.length) {
    throw new BadRequestError('No puedes adjuntar el mismo archivo más de una vez');
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.opportunityComment.create({
      data: { opportunityId, authorId: actor.id, body },
    });

    if (fileIds.length) {
      const attached = await tx.opportunityFile.updateMany({
        where: {
          opportunityId,
          commentId: null,
          id: { in: fileIds },
        },
        data: { commentId: created.id },
      });
      if (attached.count !== fileIds.length) {
        throw new BadRequestError(
          'Uno o más archivos ya fueron adjuntados o no pertenecen a esta oportunidad',
        );
      }
    }

    return created;
  });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'OPPORTUNITY',
    entityId: opportunityId,
    description: `Comentario agregado a la oportunidad: ${opportunity.name}`,
    metadata: { commentId: comment.id, attachments: fileIds.length },
  });

  return prisma.opportunityComment.findUniqueOrThrow({
    where: { id: comment.id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: opportunityFileSelect },
    },
  });
};

export const uploadFile = async (
  opportunityId: string,
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    data: Buffer;
  },
  actor: User,
) => {
  const opportunity = await findOpportunity(opportunityId);
  const created = await prisma.opportunityFile.create({
    data: {
      opportunityId,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      data: new Uint8Array(file.data),
      uploadedById: actor.id,
    },
    select: opportunityFileSelect,
  });

  await logActivity({
    userId: actor.id,
    action: 'UPLOAD',
    entityType: 'OPPORTUNITY',
    entityId: opportunityId,
    description: `Archivo adjuntado a la oportunidad ${opportunity.name}: ${created.originalName}`,
    metadata: { fileId: created.id },
  });

  return created;
};

export const getFileForDownload = async (opportunityId: string, fileId: string) => {
  const file = await prisma.opportunityFile.findFirst({
    where: { id: fileId, opportunityId },
    select: {
      originalName: true,
      mimeType: true,
      size: true,
      data: true,
    },
  });
  if (!file) throw new NotFoundError('El archivo no existe en esta oportunidad');
  return file;
};

export const deleteFile = async (
  opportunityId: string,
  fileId: string,
  actor: User,
) => {
  const file = await prisma.opportunityFile.findFirst({
    where: { id: fileId, opportunityId },
    select: { id: true, uploadedById: true, originalName: true },
  });
  if (!file) throw new NotFoundError('El archivo no existe en esta oportunidad');
  if (actor.role !== 'ADMIN' && file.uploadedById !== actor.id) {
    throw new ForbiddenError('Solo puedes eliminar los archivos que subiste tú');
  }

  await prisma.opportunityFile.delete({ where: { id: file.id } });
  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'OPPORTUNITY',
    entityId: opportunityId,
    description: `Archivo eliminado de la oportunidad: ${file.originalName}`,
    metadata: { fileId },
  });
};
