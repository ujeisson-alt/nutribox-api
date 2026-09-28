/* Logger mínimo: centraliza la salida por consola y se silencia en tests. */
const isTest = process.env.NODE_ENV === 'test';

export const logger = {
  info: (message: string): void => {
    if (!isTest) console.log(`[INFO] ${new Date().toISOString()} ${message}`);
  },
  error: (message: string, error?: unknown): void => {
    if (!isTest) console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error ?? '');
  },
};
