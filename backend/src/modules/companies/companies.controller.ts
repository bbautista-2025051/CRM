import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequestError } from '../../utils/errors';
import {
  uploadedFileOriginalName,
  uploadedFileStoredName,
} from '../../middlewares/upload';
import * as companiesService from './companies.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await companiesService.listCompanies(req.validated.query);
  res.status(200).json(result);
});

export const options = asyncHandler(async (req: Request, res: Response) => {
  const { search, limit } = req.validated.query;
  const data = await companiesService.getCompanyOptions(search, limit);
  res.status(200).json({ data });
});

export const sectors = asyncHandler(async (_req: Request, res: Response) => {
  const data = await companiesService.getSectors();
  res.status(200).json({ data });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const company = await companiesService.getCompany(req.validated.params.id);
  res.status(200).json({ data: company });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const company = await companiesService.createCompany(
    req.validated.body,
    req.auth.user,
  );
  res.status(201).json({ data: company });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const company = await companiesService.updateCompany(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: company });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const result = await companiesService.archiveCompany(
    req.validated.params.id,
    req.auth.user.id,
  );
  res.status(200).json({
    data: result.company,
    message: result.alreadyArchived
      ? 'La empresa ya estaba archivada'
      : 'Empresa archivada correctamente',
  });
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await companiesService.listCompanyComments(req.validated.params.id);
  res.status(200).json({ data: comments });
});

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const comment = await companiesService.createCompanyComment(
    req.validated.params.id,
    req.validated.body.body,
    req.validated.body.fileIds ?? [],
    req.auth.user,
  );
  res.status(201).json({ data: comment });
});

export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const files = await companiesService.listCompanyFiles(req.validated.params.id);
  res.status(200).json({ data: files });
});

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  if (!req.file) throw new BadRequestError('Selecciona un archivo para subir');

  const originalName = uploadedFileOriginalName(req.file.originalname);
  const created = await companiesService.uploadCompanyFile(
    req.validated.params.id,
    {
      originalName,
      storedName: uploadedFileStoredName(originalName),
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
    },
    req.auth.user,
  );
  res.status(201).json({ data: created });
});

export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const file = await companiesService.getCompanyFileForDownload(
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
  await companiesService.deleteCompanyFile(
    req.validated.params.id,
    req.validated.params.fileId,
    req.auth.user,
  );
  res.status(204).send();
});
