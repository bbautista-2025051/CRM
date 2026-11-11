import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
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
