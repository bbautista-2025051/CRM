import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as customSaleStatusService from './customSaleStatus.service';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const statuses = await customSaleStatusService.listSaleStatuses();
  res.status(200).json({ data: statuses });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const status = await customSaleStatusService.createSaleStatus(
    req.validated.body.name,
    req.auth.user,
  );
  res.status(201).json({ data: status });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const status = await customSaleStatusService.deleteSaleStatus(
    req.validated.params.id,
    req.auth.user,
  );
  res.status(200).json({ data: status, message: 'Estado eliminado correctamente' });
});
