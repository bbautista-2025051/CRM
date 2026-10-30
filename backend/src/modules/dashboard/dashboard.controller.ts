import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as dashboardService from './dashboard.service';

export const summary = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getDashboard();
  res.status(200).json({ data });
});
