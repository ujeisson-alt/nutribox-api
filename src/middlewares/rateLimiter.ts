import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  skip: () => isTest,
  message: { success: false, message: 'Demasiados intentos de login. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: () => isTest,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
