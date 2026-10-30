import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as companiesService from './companies.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await companiesService.listCompanies(req.validated.query);
  res.status(200).json(result);
});

export const options = asyncHandler(async (req: Request, res: Response) => {
  const { search, limit } = req.validated.query;
  const data = await companiesService.getCompanyOptions(search, limit);
  res.status(200).json({ data });
});

export const sectors = asyncHandler(async (_req: Request, res: Response) => {
  const data = await companiesService.getSectors();
  res.status(200).json({ data });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const company = await companiesService.getCompany(req.validated.params.id);
  res.status(200).json({ data: company });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const company = await companiesService.createCompany(
    req.validated.body,
    req.auth.user,
  );
  res.status(201).json({ data: company });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const company = await companiesService.updateCompany(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: company });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const result = await companiesService.archiveCompany(
    req.validated.params.id,
    req.auth.user.id,
  );
  res.status(200).json({
    data: result.company,
    message: result.alreadyArchived
      ? 'La empresa ya estaba archivada'
      : 'Empresa archivada correctamente',
  });
});
