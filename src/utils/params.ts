import { createError } from '../middlewares/errorHandler';

/** Convierte un parámetro de ruta a id entero positivo o lanza 400. */
export const parseId = (value: string | undefined): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError('El id debe ser un número entero positivo', 400);
  }
  return id;
};
