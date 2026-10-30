import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './sales.controller';
import {
  saleBodySchema,
  saleListQuerySchema,
  saleSummaryQuerySchema,
  updateSaleSchema,
} from './sales.schemas';

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get('/', validate({ query: saleListQuerySchema }), controller.list);
salesRouter.get(
  '/summary',
  validate({ query: saleSummaryQuerySchema }),
  controller.summary,
);
salesRouter.get('/:id', validate({ params: idParamSchema }), controller.getById);
salesRouter.post(
  '/',
  csrfProtection,
  validate({ body: saleBodySchema }),
  controller.create,
);
salesRouter.patch(
  '/:id',
  csrfProtection,
  validate({ params: idParamSchema, body: updateSaleSchema }),
  controller.update,
);
salesRouter.post(
  '/:id/cancel',
  csrfProtection,
  validate({ params: idParamSchema }),
  controller.cancel,
);
