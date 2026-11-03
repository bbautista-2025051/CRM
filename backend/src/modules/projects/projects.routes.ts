import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './projects.controller';
import {
  projectBodySchema,
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
  requireAdmin,
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
