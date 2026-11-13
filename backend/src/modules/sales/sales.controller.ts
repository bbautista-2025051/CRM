import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequestError } from '../../utils/errors';
import {
  uploadedFileOriginalName,
  uploadedFileStoredName,
} from '../../middlewares/upload';
import * as saleFilesService from './sale-files.service';
import * as salesService from './sales.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await salesService.listSales(req.validated.query);
  res.status(200).json(result);
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, ownerId } = req.validated.query;
  const data = await salesService.getSalesSummary(dateFrom, dateTo, ownerId);
  res.status(200).json({ data });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const sale = await salesService.getSale(req.validated.params.id);
  res.status(200).json({ data: sale });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const sale = await salesService.createSale(req.validated.body, req.auth.user);
  res.status(201).json({ data: sale });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const sale = await salesService.updateSale(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: sale });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const sale = await salesService.cancelSale(req.validated.params.id, req.auth.user);
  res.status(200).json({ data: sale, message: 'Venta cancelada correctamente' });
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await saleFilesService.listSaleComments(req.validated.params.id);
  res.status(200).json({ data: comments });
});

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const comment = await saleFilesService.createSaleComment(
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
  const file = await saleFilesService.uploadSaleFile(
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
  const file = await saleFilesService.getFileForDownload(
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
  await saleFilesService.deleteFile(
    req.validated.params.id,
    req.validated.params.fileId,
    req.auth.user,
  );
  res.status(204).send();
});
