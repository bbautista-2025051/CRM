import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './companies.controller';
import {
  companyBodySchema,
  companyListQuerySchema,
  companyOptionsQuerySchema,
  updateCompanySchema,
} from './companies.schemas';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

companiesRouter.get('/', validate({ query: companyListQuerySchema }), controller.list);
companiesRouter.get(
  '/options',
  validate({ query: companyOptionsQuerySchema }),
  controller.options,
);
companiesRouter.get('/sectors', controller.sectors);
companiesRouter.get('/:id', validate({ params: idParamSchema }), controller.getById);
companiesRouter.post(
  '/',
  csrfProtection,
  validate({ body: companyBodySchema }),
  controller.create,
);
companiesRouter.patch(
  '/:id',
  csrfProtection,
  validate({ params: idParamSchema, body: updateCompanySchema }),
  controller.update,
);
companiesRouter.delete(
  '/:id',
  requireAdmin,
  csrfProtection,
  validate({ params: idParamSchema }),
  controller.archive,
);
