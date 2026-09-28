import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';
import { toNumber } from '../../utils/decimal';

interface ProductAttributes {
  id: number;
  name: string;
  description: string | null;
  price: number;
  categoryId: number | null;
  isActive: boolean;
}

type ProductCreationAttributes = Optional<
  ProductAttributes,
  'id' | 'description' | 'categoryId' | 'isActive'
>;

class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare price: number;
  declare categoryId: number | null;
  declare isActive: boolean;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get(): number {
        return toNumber(this.getDataValue('price'));
      },
    },
    categoryId: { type: DataTypes.INTEGER, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'products', underscored: true, timestamps: true },
);

export { Product };
