import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './sales.controller';
import { saleBodySchema, saleListQuerySchema, saleSummaryQuerySchema, updateSaleSchema } from './sales.schemas';
import { listSaleComments, createSaleComment, uploadSaleFile, getFileForDownload, deleteFile } from './sale-files.service';
import { asyncHandler } from '../../utils/asyncHandler';

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

// Comment routes
salesRouter.get(
  '/:id/comments',
  validate({ params: idParamSchema }),
  asyncHandler(listSaleComments),
);

salesRouter.post(
  '/:id/comments',
  csrfProtection,
  validate({ params: idParamSchema, body: saleCommentBodySchema }),
  asyncHandler(async (req, res) => {
    const comment = await createSaleComment(
      req.validated.params.id,
      req.validated.body.body,
      req.validated.body.fileIds ?? [],
      req.auth.user,
    );
    res.status(201).json({ data: comment });
  }),
);

// File routes
salesRouter.post(
  '/:id/files',
  csrfProtection,
  asyncHandler(async (req, res) => {
    const { originalName, storedName, mimeType, size, data } = req.body;
    const file = await uploadSaleFile(
      req.validated.params.id,
      {
        originalName,
        storedName,
        mimeType,
        size,
        data: Buffer.from(data as string, 'base64'),
      },
      req.auth.user,
    );
    res.status(201).json({ data: file });
  }),
);

salesRouter.get(
  '/:id/files/:fileId',
  validate({ params: { fileId: idParamSchema } }),
  asyncHandler(async (req, res) => {
    const file = await getFileForDownload(req.validated.params.id, req.validated.params.fileId);
    res.set('Content-Type', file.mimeType || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.send(file.data);
  }),
);

salesRouter.delete(
  '/:id/files/:fileId',
  validate({ params: { fileId: idParamSchema } }),
  asyncHandler(async (req, res) => {
    await deleteFile(req.validated.params.id, req.validated.params.fileId, req.auth.user);
    res.status(204).send();
  }),
);