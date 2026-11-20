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

salesRouter.get(
  '/:id/ticket/comments',
  validate({ params: idParamSchema }),
  controller.listTicketComments,
);

salesRouter.post(
  '/:id/ticket/comments',
  csrfProtection,
  validate({ params: idParamSchema, body: saleCommentBodySchema }),
  controller.createTicketComment,
);

salesRouter.post(
  '/:id/ticket/files',
  csrfProtection,
  validate({ params: idParamSchema }),
  saleFileUpload.single('file'),
  controller.uploadTicketFile,
);

salesRouter.get(
  '/:id/ticket/files/:fileId/download',
  validate({ params: saleFileParamsSchema }),
  controller.downloadTicketFile,
);

salesRouter.delete(
  '/:id/ticket/files/:fileId',
  csrfProtection,
  validate({ params: saleFileParamsSchema }),
  controller.removeTicketFile,
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
