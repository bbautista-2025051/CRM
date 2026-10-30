import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './opportunities.controller';
import {
  opportunityBodySchema,
  opportunityListQuerySchema,
  updateOpportunitySchema,
} from './opportunities.schemas';

export const opportunitiesRouter = Router();

opportunitiesRouter.use(requireAuth);

opportunitiesRouter.get(
  '/',
  validate({ query: opportunityListQuerySchema }),
  controller.list,
);
opportunitiesRouter.get('/:id', validate({ params: idParamSchema }), controller.getById);
opportunitiesRouter.post(
  '/',
  csrfProtection,
  validate({ body: opportunityBodySchema }),
  controller.create,
);
opportunitiesRouter.patch(
  '/:id',
  csrfProtection,
  validate({ params: idParamSchema, body: updateOpportunitySchema }),
  controller.update,
);
opportunitiesRouter.delete(
  '/:id',
  csrfProtection,
  validate({ params: idParamSchema }),
  controller.remove,
);
