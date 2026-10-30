import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import * as controller from './users.controller';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userIdSchema,
  userListQuerySchema,
} from './users.schemas';

export const usersRouter = Router();

// Todo el módulo está protegido: la autorización se verifica en el backend.
usersRouter.use(requireAuth, requireAdmin);

usersRouter.get('/', validate({ query: userListQuerySchema }), controller.list);
usersRouter.post(
  '/',
  csrfProtection,
  validate({ body: createUserSchema }),
  controller.create,
);
usersRouter.get('/:id', validate({ params: userIdSchema }), controller.getById);
usersRouter.patch(
  '/:id',
  csrfProtection,
  validate({ params: userIdSchema, body: updateUserSchema }),
  controller.update,
);
usersRouter.post(
  '/:id/reset-password',
  csrfProtection,
  validate({ params: userIdSchema, body: resetPasswordSchema }),
  controller.resetPassword,
);
