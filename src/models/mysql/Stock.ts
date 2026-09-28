import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface StockAttributes {
  id: number;
  productId: number;
  quantity: number;
}

type StockCreationAttributes = Optional<StockAttributes, 'id' | 'quantity'>;

class Stock extends Model<StockAttributes, StockCreationAttributes> implements StockAttributes {
  declare id: number;
  declare productId: number;
  declare quantity: number;
}

Stock.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
  },
  {
    sequelize,
    tableName: 'stock',
    underscored: true,
    timestamps: true,
    createdAt: false,
    updatedAt: 'lastUpdated',
  },
);

export { Stock };
