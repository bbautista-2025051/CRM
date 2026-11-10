import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequestError } from '../../utils/errors';
import {
  uploadedFileOriginalName,
  uploadedFileStoredName,
} from '../../middlewares/upload';
import * as opportunityFilesService from './opportunity-files.service';
import * as opportunitiesService from './opportunities.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await opportunitiesService.listOpportunities(req.validated.query);
  res.status(200).json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const opportunity = await opportunitiesService.getOpportunity(req.validated.params.id);
  res.status(200).json({ data: opportunity });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const opportunity = await opportunitiesService.createOpportunity(
    req.validated.body,
    req.auth.user,
  );
  res.status(201).json({ data: opportunity });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const opportunity = await opportunitiesService.updateOpportunity(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: opportunity });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  await opportunitiesService.deleteOpportunity(req.validated.params.id, req.auth.user);
  res.status(204).send();
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await opportunityFilesService.listComments(req.validated.params.id);
  res.status(200).json({ data: comments });
});

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const comment = await opportunityFilesService.createComment(
    req.validated.params.id,
    req.validated.body.body,
    req.validated.body.fileIds ?? [],
    req.auth.user,
  );
  res.status(201).json({ data: comment });
});

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  if (!req.file) throw new BadRequestError('Selecciona un archivo para subir');
  const originalName = uploadedFileOriginalName(req.file.originalname);
  const file = await opportunityFilesService.uploadFile(
    req.validated.params.id,
    {
      originalName,
      storedName: uploadedFileStoredName(originalName),
      mimeType: req.file.mimetype.slice(0, 120),
      size: req.file.size,
      data: req.file.buffer,
    },
    req.auth.user,
  );
  res.status(201).json({ data: file });
});

export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const file = await opportunityFilesService.getFileForDownload(
    req.validated.params.id,
    req.validated.params.fileId,
  );
  const encodedName = encodeURIComponent(file.originalName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
  res.setHeader('Content-Length', file.data.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', 'sandbox');
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).end(file.data);
});

export const removeFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  await opportunityFilesService.deleteFile(
    req.validated.params.id,
    req.validated.params.fileId,
    req.auth.user,
  );
  res.status(204).send();
});
