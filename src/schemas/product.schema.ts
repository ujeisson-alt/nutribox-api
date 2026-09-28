import { z } from 'zod';

const price = z.coerce.number().positive('El precio debe ser mayor a 0').max(99999999.99);

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  description: z.string().trim().max(2000).optional(),
  price,
  categoryId: z.number().int().positive().nullable().optional(),
  stock: z.number().int().min(0, 'El stock no puede ser negativo').optional().default(0),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).nullable(),
    price,
    categoryId: z.number().int().positive().nullable(),
    isActive: z.boolean(),
    stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

export const productQuerySchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    search: z.string().trim().max(100).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice no puede ser mayor que maxPrice',
    path: ['minPrice'],
  });

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'El rating mínimo es 1').max(5, 'El rating máximo es 5'),
  comment: z.string().trim().max(1000).optional().default(''),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
