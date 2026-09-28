import { Router } from 'express';
import {
  getAllOrders,
  getOrderById,
  getOrderItems,
  createOrder,
  updateOrderStatus,
} from '../controllers/orders.controller';
import { validate } from '../middlewares/validate';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { createOrderSchema, orderQuerySchema, updateOrderStatusSchema } from '../schemas/order.schema';

const router = Router();

router.use(authMiddleware);

router.get('/', validate(orderQuerySchema, 'query'), getAllOrders);
router.get('/:id', getOrderById);
router.get('/:id/items', getOrderItems);
router.post('/', validate(createOrderSchema), createOrder);
router.patch('/:id/status', requireRole('ADMIN'), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
