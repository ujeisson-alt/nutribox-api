import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller';
import { validate } from '../middlewares/validate';
import { authMiddleware, optionalAuth, requireRole, requireSelfOrAdmin } from '../middlewares/auth';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';

const router = Router();

router.get('/', authMiddleware, requireRole('ADMIN'), getAllUsers);
router.get('/:id', authMiddleware, requireRole('ADMIN'), getUserById);
router.post('/', optionalAuth, validate(createUserSchema), createUser);
router.put('/:id', authMiddleware, requireSelfOrAdmin, validate(updateUserSchema), updateUser);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteUser);

export default router;
