import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFoundError } from '../../utils/errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Sirve la foto de perfil guardada en la base de datos.
 *
 * Es pública a propósito: la etiqueta <img> del frontend (otro dominio en
 * Render) no puede enviar el Bearer ni, con el bloqueo de cookies de terceros,
 * la cookie de sesión. El id es un UUID no enumerable y solo expone la foto
 * de perfil, que ya se muestra a todo el equipo dentro de la aplicación.
 */
export const avatarsRouter = Router();

avatarsRouter.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = String(req.params.userId);
    if (!UUID.test(userId)) throw new NotFoundError('La imagen no existe');

    const avatar = await prisma.userAvatar.findUnique({ where: { userId } });
    if (!avatar || !ALLOWED_MIME.has(avatar.mimeType)) {
      throw new NotFoundError('La imagen no existe');
    }

    res.setHeader('Content-Type', avatar.mimeType);
    // helmet pone same-site por defecto; el frontend vive en otro subdominio.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    // La URL lleva ?v=<timestamp>, así que puede cachearse sin riesgo.
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(avatar.data));
  }),
);
