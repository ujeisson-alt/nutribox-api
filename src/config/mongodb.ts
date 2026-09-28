import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectMongoDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está definida en las variables de entorno');
  }
  await mongoose.connect(uri);
  logger.info('MongoDB conectado correctamente');
};

export const disconnectMongoDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
