import './types';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import authRouter from './routes/auth.routes';
import usersRouter from './routes/users.routes';
import productsRouter from './routes/products.routes';
import categoriesRouter from './routes/categories.routes';
import ordersRouter from './routes/orders.routes';
import reportsRouter from './routes/reports.routes';

const app = express();

// Railway/Render ponen un proxy delante: necesario para que req.ip y el rate limit sean correctos
app.set('trust proxy', 1);

// Middlewares globales
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'API NutriBox corriendo', version: '1.0.0', docs: '/api/v1' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// Rutas
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/reports', reportsRouter);

// Ruta 404
app.use('*', notFoundHandler);

// Error handler (siempre al final)
app.use(errorHandler);

export default app;
