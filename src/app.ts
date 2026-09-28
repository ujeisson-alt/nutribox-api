import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'API NutriBox corriendo', version: '1.0.0' });
});

export default app;
