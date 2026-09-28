import { Request, Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { toNumber } from '../utils/decimal';
import { SalesReportQuery } from '../schemas/report.schema';

/** Estados que cuentan como venta efectiva (excluye PENDING y CANCELLED). */
const SOLD_STATUSES = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'];

interface SummaryRow {
  totalOrders: number;
  totalRevenue: string | null;
  averageTicket: string | null;
}
interface StatusRow {
  status: string;
  orders: number;
}
interface TopProductRow {
  productId: number;
  name: string;
  unitsSold: string;
  revenue: string;
}
interface DailyRow {
  date: string;
  orders: number;
  revenue: string;
}

export const getSalesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to } = req.query as unknown as SalesReportQuery;

    // Rango por defecto: últimos 30 días
    const toDate = to ?? new Date().toISOString().slice(0, 10);
    const fromDate =
      from ?? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const range = 'o.created_at >= :fromDate AND o.created_at < DATE_ADD(:toDate, INTERVAL 1 DAY)';
    const replacements = { fromDate, toDate, sold: SOLD_STATUSES };

    const [summary] = await sequelize.query<SummaryRow>(
      `SELECT COUNT(*) AS totalOrders, SUM(o.total) AS totalRevenue, AVG(o.total) AS averageTicket
       FROM orders o WHERE ${range} AND o.status IN (:sold)`,
      { replacements, type: QueryTypes.SELECT },
    );

    const byStatus = await sequelize.query<StatusRow>(
      `SELECT o.status, COUNT(*) AS orders FROM orders o WHERE ${range} GROUP BY o.status`,
      { replacements, type: QueryTypes.SELECT },
    );

    const topProducts = await sequelize.query<TopProductRow>(
      `SELECT p.id AS productId, p.name, SUM(oi.quantity) AS unitsSold,
              SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE ${range} AND o.status IN (:sold)
       GROUP BY p.id, p.name
       ORDER BY unitsSold DESC
       LIMIT 5`,
      { replacements, type: QueryTypes.SELECT },
    );

    const daily = await sequelize.query<DailyRow>(
      `SELECT DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date, COUNT(*) AS orders, SUM(o.total) AS revenue
       FROM orders o WHERE ${range} AND o.status IN (:sold)
       GROUP BY date ORDER BY date`,
      { replacements, type: QueryTypes.SELECT },
    );

    res.status(200).json({
      success: true,
      data: {
        period: { from: fromDate, to: toDate },
        summary: {
          totalOrders: Number(summary?.totalOrders ?? 0),
          totalRevenue: toNumber(summary?.totalRevenue),
          averageTicket: toNumber(summary?.averageTicket),
        },
        ordersByStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.orders)])),
        topProducts: topProducts.map((r) => ({
          productId: r.productId,
          name: r.name,
          unitsSold: Number(r.unitsSold),
          revenue: toNumber(r.revenue),
        })),
        salesByDay: daily.map((r) => ({
          date: r.date,
          orders: Number(r.orders),
          revenue: toNumber(r.revenue),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Usa la vista vw_pending_orders_today definida en database/schema.sql. */
export const getPendingToday = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await sequelize.query<Record<string, unknown>>(
      'SELECT * FROM vw_pending_orders_today ORDER BY created_at',
      { type: QueryTypes.SELECT },
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
