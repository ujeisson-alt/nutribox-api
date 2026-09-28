import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/mysql';
import { createError } from '../middlewares/errorHandler';
import { signToken } from '../utils/auth';
import { logActivity } from '../utils/activityLogger';
import { LoginInput, RegisterInput } from '../schemas/auth.schema';

export const SALT_ROUNDS = 12;

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body as RegisterInput;

    const existing = await User.findOne({ where: { email } });
    if (existing) throw createError('El email ya está registrado', 409);

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    // El registro público siempre crea usuarios con rol USER
    const user = await User.create({ name, email, password: hashedPassword, role: 'USER' });

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await User.findOne({ where: { email } });
    const isValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isValid) {
      await logActivity(user?.id ?? 0, 'LOGIN_FAILED', { email }, req.ip);
      // Mismo mensaje en ambos casos para no revelar qué emails existen
      throw createError('Credenciales inválidas', 401);
    }
    if (!user.isActive) throw createError('La cuenta está desactivada', 403);

    await logActivity(user.id, 'LOGIN', {}, req.ip);

    const token = signToken({ id: user.id, role: user.role });
    res.status(200).json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // JWT es stateless: el cliente descarta el token; aquí solo dejamos registro de auditoría
    await logActivity(req.user!.id, 'LOGOUT', {}, req.ip);
    res.status(200).json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id, { attributes: { exclude: ['password'] } });
    if (!user) throw createError('Usuario no encontrado', 404);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
