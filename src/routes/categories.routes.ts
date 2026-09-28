import { Router } from 'express';
import { getCategories, createCategory } from '../controllers/products.controller';
import { validate } from '../middlewares/validate';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { createCategorySchema } from '../schemas/product.schema';

const router = Router();

router.get('/', getCategories);
router.post('/', authMiddleware, requireRole('ADMIN'), validate(createCategorySchema), createCategory);

export default router;
