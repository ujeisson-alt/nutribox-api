import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/** Middleware de validación reutilizable con Zod. */
export const validate =
  (schema: ZodSchema, part: RequestPart = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    req[part] = result.data;
    next();
  };
