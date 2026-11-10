import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
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
opportunitiesRouter.delete(
  '/:id/files/:fileId',
  csrfProtection,
  validate({ params: opportunityFileParamsSchema }),
  controller.removeFile,
);
