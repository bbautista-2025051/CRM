import { Router } from 'express';
import {
  requireAuth,
  requireTeamTaskManager,
} from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import {
  projectIdParamsSchema,
  projectTaskParamsSchema,
  taskBodySchema,
  teamQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from '../projects/projects.schemas';
import * as controller from './team.controller';

export const teamRouter = Router();

teamRouter.use(requireAuth);

// Cada integrante ve sus tareas; los responsables de equipo pueden ver el resumen completo.
teamRouter.get(
  '/overview',
  validate({ query: teamQuerySchema }),
  controller.overview,
);
teamRouter.get('/members', requireTeamTaskManager, controller.members);

// --- Detalle de una tarea (cualquier usuario autenticado puede ver su propia tarea) ---
// Debe ir ANTES de las rutas con :projectId para evitar que Express haga match
// con :projectId = "tasks".
teamRouter.get(
  '/tasks/:taskId',
  validate({ params: taskIdParamsSchema }),
  controller.getTaskDetail,
);

// --- Gestión de tareas por proyecto (ADMIN, GERENTE y OPERACIONES) ---

teamRouter.post(
  '/:projectId/tasks',
  requireTeamTaskManager,
  csrfProtection,
  validate({ params: projectIdParamsSchema, body: taskBodySchema }),
  controller.createTask,
);

teamRouter.patch(
  '/:projectId/tasks/:taskId',
  requireTeamTaskManager,
  csrfProtection,
  validate({ params: projectTaskParamsSchema, body: updateTaskSchema }),
  controller.updateTask,
);

teamRouter.delete(
  '/:projectId/tasks/:taskId',
  requireTeamTaskManager,
  csrfProtection,
  validate({ params: projectTaskParamsSchema }),
  controller.deleteTask,
);
