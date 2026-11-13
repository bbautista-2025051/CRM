import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/', controller.list);
notificationsRouter.patch('/read-all', csrfProtection, controller.markAllRead);
notificationsRouter.patch(
  '/:id/read',
  csrfProtection,
  validate({ params: idParamSchema }),
  controller.markRead,
);
