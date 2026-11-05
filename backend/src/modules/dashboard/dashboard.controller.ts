import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as dashboardService from './dashboard.service';

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboard(req.validated.query);
  res.status(200).json({ data });
});
