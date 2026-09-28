import dotenv from 'dotenv';
import path from 'path';

// Las pruebas de integración leen .env.test (ver .env.test.example)
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), quiet: true });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_only_for_jest_0123456789';
