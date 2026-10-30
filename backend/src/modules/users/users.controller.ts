import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as usersService from './users.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await usersService.listUsers(req.validated.query);
  res.status(200).json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUser(req.validated.params.id);
  res.status(200).json({ data: user });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const user = await usersService.createUser(req.validated.body, req.auth.user.id);
  res.status(201).json({ data: user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const user = await usersService.updateUser(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: user });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  await usersService.resetUserPassword(
    req.validated.params.id,
    req.validated.body.newPassword,
    req.auth.user,
  );
  res.status(204).send();
});
