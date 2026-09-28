/**
 * Flujo completo contra MySQL y MongoDB reales (base de datos de test).
 * Se ejecuta solo si RUN_INTEGRATION=true (ver .env.test.example).
 */
import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import app from '../../src/app';
import { sequelize } from '../../src/config/database';
import { Order, User, Stock } from '../../src/models/mysql';
import { ActivityLog } from '../../src/models/mongo/ActivityLog';
import { ProductReview } from '../../src/models/mongo/ProductReview';

const run = process.env.RUN_INTEGRATION === 'true' ? describe : describe.skip;
const API = '/api/v1';

run('NutriBox API — flujo de integración', () => {
  let userToken = '';
  let adminToken = '';
  let orderId = 0;
  const userEmail = `ana.${Date.now()}@test.com`;

  beforeAll(async () => {
    await sequelize.authenticate();
    await mongoose.connect(process.env.MONGODB_URI!);
    await Order.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Stock.update({ quantity: 20 }, { where: {} });
    await ActivityLog.deleteMany({});
    await ProductReview.deleteMany({});
    await User.create({
      name: 'Admin Test',
      email: 'admin@test.com',
      password: await bcrypt.hash('AdminPass123', 4),
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await sequelize.close();
    await mongoose.disconnect();
  });

  it('registra un usuario (201) y devuelve token', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'Ana Pérez', email: userEmail, password: 'Password123' });
    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('password');
    userToken = res.body.token;
  });

  it('rechaza email duplicado con 409', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'Ana Pérez', email: userEmail, password: 'Password123' });
    expect(res.status).toBe(409);
  });

  it('login ADMIN (200) y registra LOGIN en MongoDB', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'admin@test.com', password: 'AdminPass123' });
    expect(res.status).toBe(200);
    adminToken = res.body.token;
    expect(await ActivityLog.countDocuments({ action: 'LOGIN' })).toBe(1);
  });

  it('login con contraseña incorrecta devuelve 401', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'admin@test.com', password: 'Incorrecta1' });
    expect(res.status).toBe(401);
  });

  it('lista productos con filtros y paginación (público)', async () => {
    const res = await request(app).get(`${API}/products?maxPrice=5&limit=2`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.data.every((p: { price: number }) => p.price <= 5)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2 });
  });

  it('GET de un producto inexistente devuelve 404', async () => {
    const res = await request(app).get(`${API}/products/99999`);
    expect(res.status).toBe(404);
  });

  it('USER no puede crear productos (403)', async () => {
    const res = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Producto X', price: 10 });
    expect(res.status).toBe(403);
  });

  it('crea un pedido calculando el total en el servidor', async () => {
    const res = await request(app)
      .post(`${API}/orders`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [
          { productId: 1, quantity: 2 },
          { productId: 5, quantity: 1 },
        ],
        deliveryAddress: 'Calle 123 #45-67, Bogotá',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.total).toBeCloseTo(8.5 * 2 + 3.8, 2);
    orderId = res.body.data.id;
    expect(await ActivityLog.countDocuments({ action: 'ORDER_CREATED' })).toBe(1);
  });

  it('rechaza pedidos sin stock suficiente (409)', async () => {
    const res = await request(app)
      .post(`${API}/orders`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ productId: 2, quantity: 99 }], deliveryAddress: 'Calle 123 #45-67' });
    expect(res.status).toBe(409);
  });

  it('confirmar el pedido descuenta stock vía sp_confirm_order', async () => {
    const res = await request(app)
      .patch(`${API}/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
    const stock = await Stock.findOne({ where: { productId: 1 } });
    expect(stock?.quantity).toBe(18);
  });

  it('transición inválida devuelve 409', async () => {
    const res = await request(app)
      .patch(`${API}/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PENDING' });
    expect(res.status).toBe(409);
  });

  it('el reporte de ventas refleja el pedido confirmado', async () => {
    const res = await request(app)
      .get(`${API}/reports/sales`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalOrders).toBe(1);
    expect(res.body.data.summary.totalRevenue).toBeCloseTo(20.8, 2);
    expect(res.body.data.topProducts[0]).toMatchObject({ productId: 1, unitsSold: 2 });
  });

  it('cancelar un pedido confirmado devuelve el stock', async () => {
    const res = await request(app)
      .patch(`${API}/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });
    expect(res.status).toBe(200);
    const stock = await Stock.findOne({ where: { productId: 1 } });
    expect(stock?.quantity).toBe(20);
  });

  it('el usuario ve sus items; sin token recibe 401', async () => {
    const ok = await request(app)
      .get(`${API}/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toHaveLength(2);
    const noToken = await request(app).get(`${API}/orders/${orderId}/items`);
    expect(noToken.status).toBe(401);
  });

  it('permite una sola reseña por usuario y producto', async () => {
    const first = await request(app)
      .post(`${API}/products/1/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: 5, comment: 'Excelente' });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post(`${API}/products/1/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: 3 });
    expect(second.status).toBe(409);
  });
});
