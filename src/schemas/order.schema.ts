import { z } from 'zod';
import { ORDER_STATUSES } from '../types';

const today = (): string => new Date().toISOString().slice(0, 10);

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1, 'La cantidad mínima es 1').max(100),
      }),
    )
    .min(1, 'El pedido debe tener al menos un producto')
    .max(50),
  deliveryAddress: z.string().trim().min(5, 'La dirección de entrega es obligatoria').max(500),
  deliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha esperado: YYYY-MM-DD')
    .refine((d) => d >= today(), 'La fecha de entrega no puede estar en el pasado')
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const orderQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
