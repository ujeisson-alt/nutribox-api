import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { verifyToken } from '../utils/auth';
import { UserRole } from '../types';

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1] || null;
};

/** Exige un JWT válido en Authorization: Bearer <token>. */
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (!token) throw createError('Token no proporcionado', 401);
  try {
    req.user = verifyToken(token);
  } catch {
    throw createError('Token inválido o expirado', 401);
  }
  next();
};

/** Si hay token lo decodifica, pero no lo exige (rutas públicas con comportamiento extra para ADMIN). */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      throw createError('Token inválido o expirado', 401);
    }
  }
  next();
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw createError('Acceso no autorizado', 403);
    }
    next();
  };

/** Permite el acceso al dueño del recurso (:id) o a un ADMIN. */
export const requireSelfOrAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const isAdmin = req.user?.role === 'ADMIN';
  const isSelf = req.user?.id === Number(req.params.id);
  if (!isAdmin && !isSelf) throw createError('Acceso no autorizado', 403);
  next();
};
