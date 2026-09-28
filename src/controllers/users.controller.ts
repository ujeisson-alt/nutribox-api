import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/mysql';
import { createError } from '../middlewares/errorHandler';
import { parseId } from '../utils/params';
import { logActivity } from '../utils/activityLogger';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';
import { SALT_ROUNDS } from './auth.controller';

export const getAllUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']],
    });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findByPk(parseId(req.params.id), {
      attributes: { exclude: ['password'] },
    });
    if (!user) throw createError('Usuario no encontrado', 404);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as CreateUserInput;

    // Solo un ADMIN autenticado puede crear otros ADMIN
    if (role === 'ADMIN' && req.user?.role !== 'ADMIN') {
      throw createError('Solo un administrador puede crear usuarios ADMIN', 403);
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) throw createError('El email ya está registrado', 409);

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, password: hashedPassword, role });

    res.status(201).json({ success: true, data: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const changes = req.body as UpdateUserInput;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAdmin && (changes.role !== undefined || changes.isActive !== undefined)) {
      throw createError('Solo un administrador puede cambiar el rol o el estado', 403);
    }

    const user = await User.findByPk(id);
    if (!user) throw createError('Usuario no encontrado', 404);

    if (changes.email && changes.email !== user.email) {
      const taken = await User.findOne({ where: { email: changes.email } });
      if (taken) throw createError('El email ya está registrado', 409);
    }

    const { password, ...rest } = changes;
    await user.update({
      ...rest,
      ...(password && { password: await bcrypt.hash(password, SALT_ROUNDS) }),
    });

    await logActivity(
      req.user!.id,
      'PROFILE_UPDATED',
      { targetUserId: id, fields: Object.keys(changes) },
      req.ip,
    );

    res.status(200).json({ success: true, data: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * Baja lógica (is_active = false): conserva el historial de pedidos,
 * que se perdería por el ON DELETE CASCADE de orders.user_id.
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (id === req.user!.id) throw createError('No puedes desactivar tu propia cuenta', 400);

    const user = await User.findByPk(id);
    if (!user) throw createError('Usuario no encontrado', 404);

    await user.update({ isActive: false });
    res.status(200).json({ success: true, message: 'Usuario desactivado correctamente' });
  } catch (error) {
    next(error);
  }
};
