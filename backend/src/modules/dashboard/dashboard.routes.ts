import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as controller from './dashboard.controller';
import { dashboardQuerySchema } from './dashboard.schemas';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get(
  '/summary',
  validate({ query: dashboardQuerySchema }),
  controller.summary,
);
