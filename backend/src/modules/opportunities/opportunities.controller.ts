import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
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
