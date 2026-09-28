import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';
import { OrderStatus, ORDER_STATUSES } from '../../types';
import { toNumber } from '../../utils/decimal';

interface OrderAttributes {
  id: number;
  userId: number;
  status: OrderStatus;
  total: number;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrderCreationAttributes = Optional<
  OrderAttributes,
  'id' | 'status' | 'total' | 'deliveryDate' | 'deliveryAddress'
>;

class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  declare id: number;
  declare userId: number;
  declare status: OrderStatus;
  declare total: number;
  declare deliveryDate: string | null;
  declare deliveryAddress: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM(...ORDER_STATUSES), defaultValue: 'PENDING' },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      get(): number {
        return toNumber(this.getDataValue('total'));
      },
    },
    deliveryDate: { type: DataTypes.DATEONLY, allowNull: true },
    deliveryAddress: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'orders', underscored: true, timestamps: true },
);

export { Order };
