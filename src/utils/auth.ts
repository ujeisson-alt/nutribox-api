import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthUser, UserRole } from '../types';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está definida en las variables de entorno');
  return secret;
};

export const signToken = (payload: AuthUser): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];
  return jwt.sign({ id: payload.id, role: payload.role }, getSecret(), { expiresIn });
};

const isRole = (value: unknown): value is UserRole => value === 'USER' || value === 'ADMIN';

/** Verifica firma y expiración; devuelve el payload tipado o lanza. */
export const verifyToken = (token: string): AuthUser => {
  const decoded = jwt.verify(token, getSecret());
  if (typeof decoded === 'string' || typeof decoded.id !== 'number' || !isRole(decoded.role)) {
    throw new Error('Payload de token inválido');
  }
  return { id: decoded.id, role: decoded.role };
};
