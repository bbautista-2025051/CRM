import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const uniqueFieldMessages: Record<string, string> = {
  email: 'Ya existe un registro con ese correo electrónico',
  tax_id: 'Ya existe una empresa con ese NIT / identificación fiscal',
  google_id: 'Esa cuenta de Google ya está vinculada a otro usuario',
  sale_number: 'El número de venta ya existe',
  opportunity_id: 'Esa oportunidad ya tiene una venta asociada',
};

const prismaMessage = (error: Prisma.PrismaClientKnownRequestError): string => {
  switch (error.code) {
    case 'P2002': {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[])
        : [];
      const field = target[0] ?? '';
      return uniqueFieldMessages[field] ?? 'Ya existe un registro con esos datos';
    }
    case 'P2003':
      return 'La operación está vinculada a otros registros y no se puede completar';
    case 'P2025':
      return 'El registro solicitado no existe o ya fue modificado';
    case 'P2000':
      return 'Uno de los valores excede la longitud permitida';
    default:
      return 'No se pudo completar la operación en la base de datos';
  }
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, 'NOT_FOUND', `La ruta ${req.method} ${req.path} no existe`));
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Revisa los datos enviados';
    details = {
      fields: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 409;
    code = error.code === 'P2025' ? 'NOT_FOUND' : 'DATABASE_CONSTRAINT';
    message = prismaMessage(error);
  } else if (error instanceof MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = 'UPLOAD_ERROR';
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo permitido'
        : 'No se pudo procesar el archivo';
  } else if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: number }).status === 400
  ) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'El cuerpo de la solicitud no contiene JSON válido';
  }

  // No se registran bodies, cookies ni cabeceras sensibles.
  const logPayload = {
    err: error,
    method: req.method,
    path: req.path,
    statusCode,
    userId: req.auth?.user.id,
  };

  if (statusCode >= 500) {
    logger.error(logPayload, 'Error no controlado');
  } else {
    logger.warn(logPayload, 'Solicitud rechazada');
  }

  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(env.isProduction || !(error instanceof Error) ? {} : { stack: undefined }),
    },
  });
};
