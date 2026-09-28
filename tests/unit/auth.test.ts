import request from 'supertest';
import app from '../../src/app';
import { signToken, verifyToken } from '../../src/utils/auth';
import { ALLOWED_TRANSITIONS } from '../../src/controllers/orders.controller';

describe('JWT helpers', () => {
  it('firma y verifica un token con id y rol', () => {
    const token = signToken({ id: 7, role: 'ADMIN' });
    expect(verifyToken(token)).toEqual({ id: 7, role: 'ADMIN' });
  });

  it('rechaza un token manipulado', () => {
    const token = signToken({ id: 7, role: 'USER' });
    expect(() => verifyToken(`${token}x`)).toThrow();
  });
});

describe('Seguridad de rutas (sin base de datos)', () => {
  it('GET / responde 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/NutriBox/);
  });

  it('ruta inexistente devuelve 404 en JSON', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Ruta no encontrada' });
  });

  it('ruta protegida sin token devuelve 401', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(401);
  });

  it('token inválido devuelve 401', async () => {
    const res = await request(app).get('/api/v1/orders').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('USER intentando ver el reporte de ventas recibe 403', async () => {
    const token = signToken({ id: 1, role: 'USER' });
    const res = await request(app).get('/api/v1/reports/sales').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('body inválido en login devuelve 400 con errores por campo', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'no-es-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('email');
    expect(res.body.errors).toHaveProperty('password');
  });

  it('JSON mal formado devuelve 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
  });
});

describe('Máquina de estados de pedidos', () => {
  it('no permite volver atrás ni salir de estados finales', () => {
    expect(ALLOWED_TRANSITIONS.CONFIRMED).not.toContain('PENDING');
    expect(ALLOWED_TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toHaveLength(0);
  });
});
