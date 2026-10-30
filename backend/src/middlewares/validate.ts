import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { BadRequestError } from '../utils/errors';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Valida body/query/params con Zod y deja los datos saneados en req.validated.
 * Nunca se asigna directamente a req.body para evitar mass assignment.
 */
export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const body = schemas.body ? schemas.body.parse(req.body) : req.body;
      const query = schemas.query ? schemas.query.parse(req.query) : req.query;
      const params = schemas.params ? schemas.params.parse(req.params) : req.params;

      req.validated = { body, query, params };
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new BadRequestError('Revisa los datos del formulario', {
            fields: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          }),
        );
        return;
      }
      next(error);
    }
  };
