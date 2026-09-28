import { Request, Response, NextFunction } from 'express';
import { UniqueConstraintError, ForeignKeyConstraintError, ValidationError } from 'sequelize';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
}

// Helper para crear errores con statusCode
export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/** Traduce errores conocidos de librerías a códigos HTTP coherentes. */
const normalizeError = (err: AppError): { statusCode: number; message: string } => {
  if (err instanceof UniqueConstraintError) {
    return { statusCode: 409, message: 'El recurso ya existe (valor duplicado)' };
  }
  if (err instanceof ForeignKeyConstraintError) {
    return { statusCode: 409, message: 'El recurso está referenciado por otros registros' };
  }
  if (err instanceof ValidationError) {
    return { statusCode: 400, message: err.errors.map((e) => e.message).join(', ') };
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return { statusCode: 400, message: 'JSON mal formado en el body' };
  }
  return {
    statusCode: err.statusCode || 500,
    message: err.statusCode ? err.message : 'Error interno del servidor',
  };
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const { statusCode, message } = normalizeError(err);

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${statusCode}: ${err.message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
};
