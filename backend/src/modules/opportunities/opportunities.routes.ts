import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { opportunityFileUpload } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './opportunities.controller';
import {
  opportunityBodySchema,
  opportunityCommentBodySchema,
  opportunityFileParamsSchema,
  opportunityListQuerySchema,
  opportunityStageBodySchema,
  opportunityStageParamsSchema,
  updateOpportunitySchema,
} from './opportunities.schemas';

export const opportunitiesRouter = Router();

opportunitiesRouter.use(requireAuth);

opportunitiesRouter.get(
  '/',
  validate({ query: opportunityListQuerySchema }),
  controller.list,
);
opportunitiesRouter.get('/stages', controller.listStages);
opportunitiesRouter.post(
  '/stages',
  requireAdmin,
  csrfProtection,
  validate({ body: opportunityStageBodySchema }),
  controller.createStage,
);
opportunitiesRouter.delete(
  '/stages/:id',
  requireAdmin,
  csrfProtection,
  validate({ params: opportunityStageParamsSchema }),
  controller.removeStage,
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
opportunitiesRouter.get(
  '/:id/comments',
  validate({ params: idParamSchema }),
  controller.listComments,
);
opportunitiesRouter.post(
  '/:id/comments',
  csrfProtection,
  validate({ params: idParamSchema, body: opportunityCommentBodySchema }),
  controller.createComment,
);
opportunitiesRouter.post(
  '/:id/files',
  csrfProtection,
  validate({ params: idParamSchema }),
  opportunityFileUpload.single('file'),
  controller.uploadFile,
);
opportunitiesRouter.get(
  '/:id/files/:fileId/download',
  validate({ params: opportunityFileParamsSchema }),
  controller.downloadFile,
);
opportunitiesRouter.get(
  '/:id/files/:fileId/preview',
  validate({ params: opportunityFileParamsSchema }),
  controller.previewFile,
);
opportunitiesRouter.delete(
  '/:id/files/:fileId',
  csrfProtection,
  validate({ params: opportunityFileParamsSchema }),
  controller.removeFile,
);
