import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';
import { UserRole } from '../../types';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role' | 'isActive'>;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: UserRole;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /** Representación segura: nunca expone el hash de la contraseña. */
  toSafeJSON(): Omit<UserAttributes, 'password'> {
    const { password: _password, ...safe } = this.get({ plain: true });
    return safe;
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('USER', 'ADMIN'), defaultValue: 'USER' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
  },
);

export { User };
