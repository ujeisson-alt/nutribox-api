/**
 * Crea el usuario administrador inicial (idempotente).
 * Uso: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run seed
 * Las credenciales se leen del entorno para no dejarlas en el código.
 */
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import bcrypt from 'bcrypt';
import { sequelize } from '../config/database';
import { User } from '../models/mysql';
import { passwordSchema } from '../schemas/user.schema';
import { SALT_ROUNDS } from '../controllers/auth.controller';
import { logger } from './logger';

const run = async (): Promise<void> => {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crear el administrador');
  }
  passwordSchema.parse(password);

  await sequelize.authenticate();
  const [admin, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      name: process.env.SEED_ADMIN_NAME || 'Administrador NutriBox',
      email,
      password: await bcrypt.hash(password, SALT_ROUNDS),
      role: 'ADMIN',
    },
  });
  logger.info(created ? `Admin creado (id ${admin.id})` : `El admin ${email} ya existía`);
  await sequelize.close();
};

run().catch((error: unknown) => {
  logger.error('Seed fallido', error);
  process.exit(1);
});
