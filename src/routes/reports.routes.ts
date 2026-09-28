import { Router } from 'express';
import { getSalesReport, getPendingToday } from '../controllers/reports.controller';
import { validate } from '../middlewares/validate';
import { authMiddleware, requireRole } from '../middlewares/auth';
import { salesReportQuerySchema } from '../schemas/report.schema';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.get('/sales', validate(salesReportQuerySchema, 'query'), getSalesReport);
router.get('/pending-today', getPendingToday);

export default router;
