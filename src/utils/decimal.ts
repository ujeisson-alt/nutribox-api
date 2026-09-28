/** mysql2 devuelve DECIMAL como string: lo normalizamos a number con 2 decimales. */
export const toNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Math.round(n * 100) / 100;
};
