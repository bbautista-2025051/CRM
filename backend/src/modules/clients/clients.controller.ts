import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as clientsService from './clients.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await clientsService.listClients(req.validated.query);
  res.status(200).json(result);
});

export const options = asyncHandler(async (req: Request, res: Response) => {
  const { search, companyId, limit } = req.validated.query;
  const data = await clientsService.getClientOptions(search, companyId, limit);
  res.status(200).json({ data });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientsService.getClient(req.validated.params.id);
  res.status(200).json({ data: client });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const client = await clientsService.createClient(
    req.validated.body,
    req.auth.user,
  );
  res.status(201).json({ data: client });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const client = await clientsService.updateClient(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: client });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const result = await clientsService.archiveClient(
    req.validated.params.id,
    req.auth.user.id,
  );
  res.status(200).json({
    data: result.client,
    message: result.alreadyArchived
      ? 'El cliente ya estaba archivado'
      : 'Cliente archivado correctamente',
  });
});
