-- Datos de prueba (categorías, productos y stock).
-- Los usuarios se crean con `npm run seed` para que las contraseñas se hasheen con bcrypt.
USE nutribox_db;

INSERT INTO categories (name, description) VALUES
  ('Bowls', 'Bowls balanceados listos para comer'),
  ('Ensaladas', 'Ensaladas frescas de estación'),
  ('Bebidas', 'Jugos naturales y smoothies'),
  ('Snacks', 'Snacks saludables');

INSERT INTO products (name, description, price, category_id) VALUES
  ('Bowl de Quinoa y Pollo', 'Quinoa, pollo grillado, palta y vegetales asados', 8.50, 1),
  ('Bowl Vegano de Garbanzos', 'Garbanzos especiados, arroz integral y hummus', 7.90, 1),
  ('Ensalada César Light', 'Lechuga romana, pollo, parmesano y aderezo de yogur', 6.75, 2),
  ('Ensalada Mediterránea', 'Tomate, pepino, aceitunas, queso feta y orégano', 6.20, 2),
  ('Smoothie Verde', 'Espinaca, manzana verde, jengibre y limón', 3.80, 3),
  ('Jugo de Naranja y Zanahoria', 'Exprimido en el día, sin azúcar agregada', 3.20, 3),
  ('Barrita de Avena y Miel', 'Avena, miel, almendras y pasas', 1.90, 4),
  ('Mix de Frutos Secos', 'Nueces, almendras, castañas y arándanos', 2.60, 4);

INSERT INTO stock (product_id, quantity) VALUES
  (1, 50), (2, 40), (3, 35), (4, 30), (5, 60), (6, 60), (7, 100), (8, 80);
