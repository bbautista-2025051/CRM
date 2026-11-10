import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { projectFileUpload } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './projects.controller';
import {
  commentBodySchema,
  projectBodySchema,
  projectFileParamsSchema,
  projectListQuerySchema,
  projectTaskParamsSchema,
  taskBodySchema,
  updateProjectSchema,
  updateTaskSchema,
} from './projects.schemas';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get('/', validate({ query: projectListQuerySchema }), controller.list);
projectsRouter.get('/:id', validate({ params: idParamSchema }), controller.getById);

projectsRouter.post(
  '/',
  requireAdmin,
  csrfProtection,
  validate({ body: projectBodySchema }),
  controller.create,
);
projectsRouter.patch(
  '/:id',
  csrfProtection,
  validate({ params: idParamSchema, body: updateProjectSchema }),
  controller.update,
);
projectsRouter.delete(
  '/:id',
  requireAdmin,
  csrfProtection,
  validate({ params: idParamSchema }),
  controller.remove,
);

projectsRouter.post(
  '/:id/tasks',
  requireAdmin,
  csrfProtection,
  validate({ params: idParamSchema, body: taskBodySchema }),
  controller.createTask,
);
projectsRouter.patch(
  '/:id/tasks/:taskId',
  requireAdmin,
  csrfProtection,
  validate({ params: projectTaskParamsSchema, body: updateTaskSchema }),
  controller.updateTask,
);
projectsRouter.delete(
  '/:id/tasks/:taskId',
  requireAdmin,
  csrfProtection,
  validate({ params: projectTaskParamsSchema }),
  controller.removeTask,
);

projectsRouter.get('/:id/comments', validate({ params: idParamSchema }), controller.listComments);
projectsRouter.post(
  '/:id/comments',
  csrfProtection,
  validate({ params: idParamSchema, body: commentBodySchema }),
  controller.createComment,
);

projectsRouter.get('/:id/files', validate({ params: idParamSchema }), controller.listFiles);
projectsRouter.get(
  '/:id/files/:fileId/download',
  validate({ params: projectFileParamsSchema }),
  controller.downloadFile,
);
projectsRouter.post(
  '/:id/files',
  csrfProtection,
  validate({ params: idParamSchema }),
  projectFileUpload.single('file'),
  controller.uploadFile,
);
projectsRouter.delete(
  '/:id/files/:fileId',
  csrfProtection,
  validate({ params: projectFileParamsSchema }),
  controller.removeFile,
);
