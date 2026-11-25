import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { saleFileUpload } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/zod';
import * as controller from './sales.controller';
import {
  saleBodySchema,
  saleCommentBodySchema,
  customSaleStatusBodySchema,
  customSaleStatusParamsSchema,
  saleFileParamsSchema,
  saleListQuerySchema,
  saleSummaryQuerySchema,
  updateSaleSchema,
  updateSaleTicketSchema,
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

salesRouter.post(
  '/:id/confirm',
  csrfProtection,
  validate({ params: idParamSchema }),
  controller.confirm,
);

// Comment routes
salesRouter.get(
  '/:id/comments',
  validate({ params: idParamSchema }),
  controller.listComments,
);

salesRouter.post(
  '/:id/comments',
  csrfProtection,
  validate({ params: idParamSchema, body: saleCommentBodySchema }),
  controller.createComment,
);

// File routes
salesRouter.post(
  '/:id/files',
  csrfProtection,
  validate({ params: idParamSchema }),
  saleFileUpload.single('file'),
  controller.uploadFile,
);

salesRouter.get(
  '/:id/files/:fileId/download',
  validate({ params: saleFileParamsSchema }),
  controller.downloadFile,
);

salesRouter.get(
  '/:id/files/:fileId/preview',
  validate({ params: saleFileParamsSchema }),
  controller.previewFile,
);

salesRouter.delete(
  '/:id/files/:fileId',
  csrfProtection,
  validate({ params: saleFileParamsSchema }),
  controller.removeFile,
);

// --- Ticket de la venta ---

salesRouter.patch(
  '/:id/ticket',
  csrfProtection,
  validate({ params: idParamSchema, body: updateSaleTicketSchema }),
  controller.updateTicket,
);

// --- Estados de venta personalizados (solo ADMIN puede crear/eliminar) ---
salesRouter.get(
  '/statuses',
  validate({ query: saleListQuerySchema }),
  controller.listSaleStatuses,
);
salesRouter.post(
  '/statuses',
  requireAdmin,
  csrfProtection,
  validate({ body: customSaleStatusBodySchema }),
  controller.createSaleStatus,
);
salesRouter.delete(
  '/statuses/:id',
  requireAdmin,
  csrfProtection,
  validate({ params: customSaleStatusParamsSchema }),
  controller.removeSaleStatus,
);
