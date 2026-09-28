export type UserRole = 'USER' | 'ADMIN';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface IUser {
  id: number;
  name: string;
  email: string;
  password?: string; // opcional para no exponer en responses
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface IProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  categoryId?: number;
  isActive: boolean;
}

export interface IOrder {
  id: number;
  userId: number;
  status: OrderStatus;
  total: number;
  deliveryDate?: string;
  deliveryAddress?: string;
}

export interface AuthUser {
  id: number;
  role: UserRole;
}

// Extender el tipo Request de Express para incluir el usuario autenticado
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
