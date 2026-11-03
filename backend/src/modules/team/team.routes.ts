import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { teamQuerySchema } from '../projects/projects.schemas';
import * as controller from './team.controller';

export const teamRouter = Router();

teamRouter.use(requireAuth, requireAdmin);

teamRouter.get('/overview', validate({ query: teamQuerySchema }), controller.overview);
