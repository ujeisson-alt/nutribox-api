import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductReviews,
  createProductReview,
} from '../controllers/products.controller';
import { validate } from '../middlewares/validate';
import { authMiddleware, requireRole } from '../middlewares/auth';
import {
  createProductSchema,
  createReviewSchema,
  productQuerySchema,
  updateProductSchema,
} from '../schemas/product.schema';

const router = Router();

router.get('/', validate(productQuerySchema, 'query'), getAllProducts);
router.get('/:id', getProductById);
router.post('/', authMiddleware, requireRole('ADMIN'), validate(createProductSchema), createProduct);
router.put('/:id', authMiddleware, requireRole('ADMIN'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteProduct);

// Reseñas (MongoDB)
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', authMiddleware, validate(createReviewSchema), createProductReview);

export default router;
