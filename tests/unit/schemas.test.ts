import { createUserSchema, updateUserSchema } from '../../src/schemas/user.schema';
import { createOrderSchema } from '../../src/schemas/order.schema';
import { productQuerySchema } from '../../src/schemas/product.schema';

describe('Zod schemas', () => {
  it('acepta un usuario válido y aplica rol USER por defecto', () => {
    const result = createUserSchema.parse({
      name: 'Ana',
      email: 'ANA@Test.com',
      password: 'Password123',
    });
    expect(result.role).toBe('USER');
    expect(result.email).toBe('ana@test.com');
  });

  it('rechaza contraseñas débiles con mensajes útiles', () => {
    const result = createUserSchema.safeParse({ name: 'Ana', email: 'ana@test.com', password: 'abc' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toEqual(
        expect.arrayContaining(['La contraseña debe tener al menos 8 caracteres']),
      );
    }
  });

  it('no permite updates vacíos ni campos desconocidos', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateUserSchema.safeParse({ foo: 'bar' }).success).toBe(false);
    expect(updateUserSchema.safeParse({ name: 'Nuevo Nombre' }).success).toBe(true);
  });

  it('valida pedidos: al menos un item y cantidades positivas', () => {
    expect(createOrderSchema.safeParse({ items: [], deliveryAddress: 'Calle 123' }).success).toBe(false);
    expect(
      createOrderSchema.safeParse({
        items: [{ productId: 1, quantity: 0 }],
        deliveryAddress: 'Calle 123',
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        items: [{ productId: 1, quantity: 2 }],
        deliveryAddress: 'Calle 123',
      }).success,
    ).toBe(true);
  });

  it('rechaza fechas de entrega en el pasado', () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: 1, quantity: 1 }],
      deliveryAddress: 'Calle 123',
      deliveryDate: '2000-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('convierte y valida filtros de productos desde query string', () => {
    const q = productQuerySchema.parse({ minPrice: '2', maxPrice: '5', page: '2' });
    expect(q).toMatchObject({ minPrice: 2, maxPrice: 5, page: 2, limit: 20 });
    expect(productQuerySchema.safeParse({ minPrice: '9', maxPrice: '1' }).success).toBe(false);
  });
});
