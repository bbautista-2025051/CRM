import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as dashboardService from './dashboard.service';

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & { validated?: { query?: Record<string, unknown> } }).validated
    ?.query ?? req.query;

  const data = await dashboardService.getDashboard({
    role:
      typeof query.role === 'string' && query.role
        ? (query.role as
            | 'ADMIN'
            | 'PROGRAMADOR'
            | 'VENDEDOR'
            | 'SUPERVISOR'
            | 'OPERACIONES')
        : undefined,
    userId: typeof query.userId === 'string' && query.userId ? query.userId : undefined,
    month: typeof query.month === 'string' && query.month ? query.month : undefined,
    year: typeof query.year === 'string' && query.year ? query.year : undefined,
  });

  res.status(200).json({ data });
});
