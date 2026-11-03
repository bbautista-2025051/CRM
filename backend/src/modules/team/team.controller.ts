import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as teamService from './team.service';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await teamService.getTeamOverview(req.validated.query));
});
