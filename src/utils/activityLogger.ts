import { ActivityLog, ActivityAction } from '../models/mongo/ActivityLog';
import { logger } from './logger';

/**
 * Registra una acción del usuario en MongoDB.
 * Un fallo al loguear nunca debe romper la request principal.
 */
export const logActivity = async (
  userId: number,
  action: ActivityAction,
  details: Record<string, unknown> = {},
  ipAddress?: string,
): Promise<void> => {
  try {
    await ActivityLog.create({ userId, action, details, ipAddress });
  } catch (error) {
    logger.error(`No se pudo registrar la actividad ${action}`, error);
  }
};
