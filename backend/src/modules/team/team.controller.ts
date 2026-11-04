import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as teamService from './team.service';
import { ForbiddenError } from '../../utils/errors';
import type { User } from '@prisma/client';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await teamService.getTeamOverview(req.validated.query));
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const task = await teamService.createTask(
    req.validated.params.projectId,
    req.validated.body,
    req.auth.user,
  );
  res.status(201).json({ data: task });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const task = await teamService.updateTask(
    req.validated.params.projectId,
    req.validated.params.taskId,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: task });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  await teamService.deleteTask(
    req.validated.params.projectId,
    req.validated.params.taskId,
    req.auth.user,
  );
  res.status(204).send();
});

export const getTaskDetail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const task = await teamService.getTaskDetail(
    req.validated.params.taskId,
    req.auth.user,
  );
  res.status(200).json({ data: task });
});
