import { User } from './User';
import { Category } from './Category';
import { Product } from './Product';
import { Stock } from './Stock';
import { Order } from './Order';
import { OrderItem } from './OrderItem';

// Relaciones (reflejan las FOREIGN KEY de database/schema.sql)
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasOne(Stock, { foreignKey: 'productId', as: 'stock' });
Stock.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export { User, Category, Product, Stock, Order, OrderItem };
