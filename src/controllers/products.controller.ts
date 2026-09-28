import { Request, Response, NextFunction } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { Category, Product, Stock } from '../models/mysql';
import { ProductReview } from '../models/mongo/ProductReview';
import { createError } from '../middlewares/errorHandler';
import { parseId } from '../utils/params';
import { logger } from '../utils/logger';
import {
  CreateCategoryInput,
  CreateProductInput,
  CreateReviewInput,
  ProductQuery,
  UpdateProductInput,
} from '../schemas/product.schema';

const productIncludes = [
  { model: Category, as: 'category', attributes: ['id', 'name'] },
  { model: Stock, as: 'stock', attributes: ['quantity'] },
];

/** Aplana el stock para que el cliente reciba `stock: number`. */
const serializeProduct = (product: Product): Record<string, unknown> => {
  const plain: Record<string, unknown> = { ...product.get({ plain: true }) };
  return { ...plain, price: product.price, stock: product.stock?.quantity ?? 0 };
};

interface RatingSummary {
  average: number | null;
  count: number;
}

/**
 * Promedio de reseñas desde MongoDB. Si Mongo no responde, el detalle del
 * producto (que vive en MySQL) se sigue sirviendo con rating vacío.
 */
const getRatingSummary = async (productId: number): Promise<RatingSummary | null> => {
  try {
    const [result] = await ProductReview.aggregate<{ average: number; count: number }>([
      { $match: { productId } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return {
      average: result ? Math.round(result.average * 10) / 10 : null,
      count: result?.count ?? 0,
    };
  } catch (error) {
    logger.error(`No se pudo calcular el rating del producto ${productId}`, error);
    return null;
  }
};

const findActiveProduct = async (id: number): Promise<Product> => {
  const product = await Product.findOne({ where: { id, isActive: true } });
  if (!product) throw createError('Producto no encontrado', 404);
  return product;
};

export const getAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId, minPrice, maxPrice, search, inStock, page, limit } =
      req.query as unknown as ProductQuery;

    const priceFilter: Record<symbol, number> = {};
    if (minPrice !== undefined) priceFilter[Op.gte] = minPrice;
    if (maxPrice !== undefined) priceFilter[Op.lte] = maxPrice;

    const where: WhereOptions = {
      isActive: true,
      ...(categoryId && { categoryId }),
      ...(Object.getOwnPropertySymbols(priceFilter).length > 0 && { price: priceFilter }),
      ...(search && { name: { [Op.like]: `%${search}%` } }),
    };

    const stockFilter =
      inStock === 'true'
        ? { quantity: { [Op.gt]: 0 } }
        : inStock === 'false'
          ? { quantity: 0 }
          : undefined;

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [
        productIncludes[0],
        { ...productIncludes[1], ...(stockFilter && { where: stockFilter, required: true }) },
      ],
      order: [['id', 'ASC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    res.status(200).json({
      success: true,
      data: rows.map(serializeProduct),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const product = await Product.findOne({ where: { id, isActive: true }, include: productIncludes });
    if (!product) throw createError('Producto no encontrado', 404);

    const rating = await getRatingSummary(id);

    res.status(200).json({
      success: true,
      data: {
        ...serializeProduct(product),
        rating,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { stock, ...data } = req.body as CreateProductInput;

    if (data.categoryId) {
      const category = await Category.findByPk(data.categoryId);
      if (!category) throw createError('La categoría indicada no existe', 400);
    }

    // Producto y stock se crean juntos o no se crea ninguno
    const productId = await sequelize.transaction(async (transaction) => {
      const product = await Product.create(data, { transaction });
      await Stock.create({ productId: product.id, quantity: stock }, { transaction });
      return product.id;
    });

    const created = await Product.findByPk(productId, { include: productIncludes });
    res.status(201).json({ success: true, data: serializeProduct(created!) });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { stock, ...changes } = req.body as UpdateProductInput;

    const product = await Product.findByPk(id);
    if (!product) throw createError('Producto no encontrado', 404);

    if (changes.categoryId) {
      const category = await Category.findByPk(changes.categoryId);
      if (!category) throw createError('La categoría indicada no existe', 400);
    }

    await sequelize.transaction(async (transaction) => {
      if (Object.keys(changes).length > 0) await product.update(changes, { transaction });
      if (stock !== undefined) {
        const [row] = await Stock.findOrCreate({
          where: { productId: id },
          defaults: { productId: id, quantity: stock },
          transaction,
        });
        await row.update({ quantity: stock }, { transaction });
      }
    });

    const updated = await Product.findByPk(id, { include: productIncludes });
    res.status(200).json({ success: true, data: serializeProduct(updated!) });
  } catch (error) {
    next(error);
  }
};

/** Baja lógica: los productos ya vendidos deben seguir existiendo en order_items (ON DELETE RESTRICT). */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await findActiveProduct(parseId(req.params.id));
    await product.update({ isActive: false });
    res.status(200).json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

// ---------- Reseñas (MongoDB) ----------

export const getProductReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseId(req.params.id);
    await findActiveProduct(productId);
    const reviews = await ProductReview.find({ productId }).sort({ createdAt: -1 }).limit(100).lean();
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

export const createProductReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseId(req.params.id);
    await findActiveProduct(productId);
    const { rating, comment } = req.body as CreateReviewInput;
    const userId = req.user!.id;

    const existing = await ProductReview.findOne({ productId, userId });
    if (existing) throw createError('Ya dejaste una reseña para este producto', 409);

    const review = await ProductReview.create({ productId, userId, rating, comment });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// ---------- Categorías ----------

export const getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await Category.create(req.body as CreateCategoryInput);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};
