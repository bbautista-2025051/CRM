import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { companyFileUpload } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './companies.controller';
import {
  companyBodySchema,
  companyCommentBodySchema,
  companyFileParamsSchema,
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

companiesRouter.get(
  '/:id/comments',
  validate({ params: idParamSchema }),
  controller.listComments,
);
companiesRouter.post(
  '/:id/comments',
  csrfProtection,
  validate({ params: idParamSchema, body: companyCommentBodySchema }),
  controller.createComment,
);

companiesRouter.get(
  '/:id/files',
  validate({ params: idParamSchema }),
  controller.listFiles,
);
companiesRouter.get(
  '/:id/files/:fileId/download',
  validate({ params: companyFileParamsSchema }),
  controller.downloadFile,
);
companiesRouter.post(
  '/:id/files',
  csrfProtection,
  validate({ params: idParamSchema }),
  companyFileUpload.single('file'),
  controller.uploadFile,
);
companiesRouter.delete(
  '/:id/files/:fileId',
  csrfProtection,
  validate({ params: companyFileParamsSchema }),
  controller.removeFile,
);

