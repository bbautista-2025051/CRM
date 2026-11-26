import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFoundError } from '../../utils/errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Sirve el logotipo de una empresa guardado en la base de datos.
 *
 * Es público a propósito, igual que los avatares de usuario: la etiqueta <img>
 * no puede enviar credenciales cuando el frontend vive en otro dominio. El id
 * es un UUID no enumerable y solo expone el logotipo que ya ve todo el equipo.
 */
export const companyAvatarsRouter = Router();

companyAvatarsRouter.get(
  '/:companyId',
  asyncHandler(async (req, res) => {
    const companyId = String(req.params.companyId);
    if (!UUID.test(companyId)) throw new NotFoundError('La imagen no existe');

    const avatar = await prisma.companyAvatar.findUnique({ where: { companyId } });
    if (!avatar || !ALLOWED_MIME.has(avatar.mimeType)) {
      throw new NotFoundError('La imagen no existe');
    }

    res.setHeader('Content-Type', avatar.mimeType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    // La URL lleva ?v=<timestamp>, así que puede cachearse sin riesgo.
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(avatar.data));
  }),
);
