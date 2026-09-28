import { Sequelize, Options } from 'sequelize';
import { logger } from '../utils/logger';

const common: Options = {
  dialect: 'mysql',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { underscored: true },
  // DECIMAL como string evita pérdida de precisión; los modelos lo convierten a number
  dialectOptions: { decimalNumbers: false },
};

/**
 * Admite DATABASE_URL (formato mysql://user:pass@host:port/db, útil en Railway)
 * o las variables sueltas DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME.
 */
export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, common)
  : new Sequelize({
      ...common,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

export const connectMySQL = async (): Promise<void> => {
  await sequelize.authenticate();
  logger.info('MySQL conectado correctamente');
};
