import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface CategoryAttributes {
  id: number;
  name: string;
  description: string | null;
}

type CategoryCreationAttributes = Optional<CategoryAttributes, 'id' | 'description'>;

class Category
  extends Model<CategoryAttributes, CategoryCreationAttributes>
  implements CategoryAttributes
{
  declare id: number;
  declare name: string;
  declare description: string | null;
}

Category.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'categories', underscored: true, timestamps: true, updatedAt: false },
);

export { Category };
