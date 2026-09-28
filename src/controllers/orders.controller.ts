import { Request, Response, NextFunction } from 'express';
import { DatabaseError, Op, Transaction, WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { Order, OrderItem, Product, Stock, User } from '../models/mysql';
import { createError } from '../middlewares/errorHandler';
import { parseId } from '../utils/params';
import { toNumber } from '../utils/decimal';
import { logActivity } from '../utils/activityLogger';
import { CreateOrderInput, OrderQuery } from '../schemas/order.schema';
import { OrderStatus } from '../types';

/** Máquina de estados del pedido: qué transiciones están permitidas. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Estados en los que el stock ya fue descontado por sp_confirm_order. */
const STOCK_RESERVED: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'];

const itemInclude = {
  model: OrderItem,
  as: 'items',
  include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
};

/** Busca el pedido y verifica que el usuario sea el dueño o ADMIN. */
const findOrderForUser = async (req: Request, withItems: boolean): Promise<Order> => {
  const id = parseId(req.params.id);
  const order = await Order.findByPk(id, withItems ? { include: [itemInclude] } : {});
  if (!order) throw createError('Pedido no encontrado', 404);
  if (req.user!.role !== 'ADMIN' && order.userId !== req.user!.id) {
    // 404 en lugar de 403 para no revelar la existencia de pedidos ajenos
    throw createError('Pedido no encontrado', 404);
  }
  return order;
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, page, limit } = req.query as unknown as OrderQuery;
    const isAdmin = req.user!.role === 'ADMIN';

    const where: WhereOptions = {
      ...(status && { status }),
      ...(!isAdmin && { userId: req.user!.id }),
    };

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: isAdmin ? [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] : [],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await findOrderForUser(req, true);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getOrderItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await findOrderForUser(req, false);
    const items = await OrderItem.findAll({
      where: { orderId: order.id },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, deliveryAddress, deliveryDate } = req.body as CreateOrderInput;

    // Agrupar cantidades si el mismo producto viene repetido
    const quantities = new Map<number, number>();
    for (const { productId, quantity } of items) {
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    const productIds = [...quantities.keys()];

    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds }, isActive: true },
      include: [{ model: Stock, as: 'stock', attributes: ['quantity'] }],
    });

    const missing = productIds.filter((id) => !products.some((p) => p.id === id));
    if (missing.length > 0) {
      throw createError(`Productos no disponibles: ${missing.join(', ')}`, 400);
    }

    const insufficient = products.filter((p) => (p.stock?.quantity ?? 0) < quantities.get(p.id)!);
    if (insufficient.length > 0) {
      throw createError(
        `Stock insuficiente para: ${insufficient.map((p) => `${p.name} (disponible ${p.stock?.quantity ?? 0})`).join(', ')}`,
        409,
      );
    }

    // El precio se toma de la base de datos, nunca del cliente
    const lines = products.map((p) => ({
      productId: p.id,
      quantity: quantities.get(p.id)!,
      unitPrice: p.price,
    }));
    const total = toNumber(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));

    const orderId = await sequelize.transaction(async (transaction) => {
      const order = await Order.create(
        { userId: req.user!.id, total, deliveryAddress, deliveryDate: deliveryDate ?? null },
        { transaction },
      );
      await OrderItem.bulkCreate(
        lines.map((l) => ({ ...l, orderId: order.id })),
        { transaction },
      );
      return order.id;
    });

    await logActivity(req.user!.id, 'ORDER_CREATED', { orderId, total, items: lines.length }, req.ip);

    const created = await Order.findByPk(orderId, { include: [itemInclude] });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/** Devuelve al stock las unidades de un pedido que ya las había descontado. */
const restoreStock = async (orderId: number, transaction: Transaction): Promise<void> => {
  const items = await OrderItem.findAll({ where: { orderId }, transaction });
  for (const item of items) {
    await Stock.increment('quantity', {
      by: item.quantity,
      where: { productId: item.productId },
      transaction,
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { status: nextStatus } = req.body as { status: OrderStatus };

    const order = await Order.findByPk(id);
    if (!order) throw createError('Pedido no encontrado', 404);

    const current = order.status;
    if (!ALLOWED_TRANSITIONS[current].includes(nextStatus)) {
      throw createError(`Transición no permitida: ${current} → ${nextStatus}`, 409);
    }

    if (nextStatus === 'CONFIRMED') {
      // Descuenta stock y confirma de forma atómica con el stored procedure
      try {
        await sequelize.query('CALL sp_confirm_order(:id)', { replacements: { id } });
      } catch (error) {
        if (error instanceof DatabaseError) {
          throw createError('Stock insuficiente para confirmar el pedido', 409);
        }
        throw error;
      }
    } else if (nextStatus === 'CANCELLED' && STOCK_RESERVED.includes(current)) {
      await sequelize.transaction(async (transaction) => {
        await restoreStock(id, transaction);
        await order.update({ status: nextStatus }, { transaction });
      });
    } else {
      await order.update({ status: nextStatus });
    }

    await order.reload();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
