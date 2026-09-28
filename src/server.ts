import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import app from './app';
import { connectMySQL, sequelize } from './config/database';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { logger } from './utils/logger';

const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI'];

const start = async (): Promise<void> => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }

  await connectMySQL();
  await connectMongoDB();

  const PORT = Number(process.env.PORT) || 3000;
  const server = app.listen(PORT, () => {
    logger.info(`NutriBox API corriendo en puerto ${PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} recibido, cerrando conexiones...`);
    server.close(async () => {
      await sequelize.close();
      await disconnectMongoDB();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error: unknown) => {
  logger.error('No se pudo iniciar el servidor', error);
  process.exit(1);
});
