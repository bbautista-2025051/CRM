import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './clients.controller';
import {
  clientBodySchema,
  clientListQuerySchema,
  clientOptionsQuerySchema,
  updateClientSchema,
} from './clients.schemas';

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

clientsRouter.get('/', validate({ query: clientListQuerySchema }), controller.list);
clientsRouter.get(
  '/options',
  validate({ query: clientOptionsQuerySchema }),
  controller.options,
);
clientsRouter.get('/:id', validate({ params: idParamSchema }), controller.getById);
clientsRouter.post(
  '/',
  csrfProtection,
  validate({ body: clientBodySchema }),
  controller.create,
);
clientsRouter.patch(
  '/:id',
  csrfProtection,
  validate({ params: idParamSchema, body: updateClientSchema }),
  controller.update,
);
clientsRouter.delete(
  '/:id',
  requireAdmin,
  csrfProtection,
  validate({ params: idParamSchema }),
  controller.archive,
);
