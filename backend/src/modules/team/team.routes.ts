import { Router } from 'express';
import {
  requireAdmin,
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

// Vista general del equipo (proyectos, miembros y tareas). Solo ADMIN y SUPERVISOR
// ya lo manejaba requireAdmin en el router original; lo mantenemos aquí explícito.
teamRouter.get(
  '/overview',
  requireAdmin,
  validate({ query: teamQuerySchema }),
  controller.overview,
);

// --- Detalle de una tarea (cualquier usuario autenticado puede ver su propia tarea) ---
// Debe ir ANTES de las rutas con :projectId para evitar que Express haga match
// con :projectId = "tasks".
teamRouter.get(
  '/tasks/:taskId',
  validate({ params: taskIdParamsSchema }),
  controller.getTaskDetail,
);

// --- Gestión de tareas por proyecto (solo ADMIN y OPERACIONES) ---

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
