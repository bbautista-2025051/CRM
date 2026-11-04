import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequestError } from '../../utils/errors';
import { projectFileOriginalName } from '../../middlewares/upload';
import * as projectsService from './projects.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await projectsService.listProjects(req.validated.query));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectsService.getProject(req.validated.params.id);
  res.status(200).json({ data: project });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const project = await projectsService.createProject(req.validated.body, req.auth.user);
  res.status(201).json({ data: project });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const project = await projectsService.updateProject(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: project });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  await projectsService.deleteProject(req.validated.params.id, req.auth.user);
  res.status(204).send();
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const task = await projectsService.createTask(
    req.validated.params.id,
    req.validated.body,
    req.auth.user,
  );
  res.status(201).json({ data: task });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const task = await projectsService.updateTask(
    req.validated.params.id,
    req.validated.params.taskId,
    req.validated.body,
    req.auth.user,
  );
  res.status(200).json({ data: task });
});

export const removeTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  await projectsService.deleteTask(
    req.validated.params.id,
    req.validated.params.taskId,
    req.auth.user,
  );
  res.status(204).send();
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await projectsService.listProjectComments(req.validated.params.id);
  res.status(200).json({ data: comments });
});

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  const comment = await projectsService.createProjectComment(
    req.validated.params.id,
    req.validated.body.body,
    req.auth.user,
  );
  res.status(201).json({ data: comment });
});

export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const files = await projectsService.listProjectFiles(req.validated.params.id);
  res.status(200).json({ data: files });
});

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  if (!req.file) throw new BadRequestError('Selecciona un archivo para subir');

  const created = await projectsService.uploadProjectFile(
    req.validated.params.id,
    {
      originalName: projectFileOriginalName(req.file.originalname),
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
    req.auth.user,
  );
  res.status(201).json({ data: created });
});

export const removeFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) return;
  await projectsService.deleteProjectFile(
    req.validated.params.id,
    req.validated.params.fileId,
    req.auth.user,
  );
  res.status(204).send();
});
