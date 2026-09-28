-- =============================================================
-- NutriBox S.A. — Esquema relacional (MySQL 8)
-- Ejecutar: mysql -u root -p < database/schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS nutribox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nutribox_db;

DROP VIEW IF EXISTS vw_pending_orders_today;
DROP PROCEDURE IF EXISTS sp_confirm_order;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;

-- Tabla categories
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('USER', 'ADMIN') DEFAULT 'USER',
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla products
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Tabla orders
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  delivery_date DATE,
  delivery_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_orders_status_created (status, created_at)
);

-- Tabla order_items
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Tabla stock
CREATE TABLE stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Vista: pedidos pendientes del día
CREATE VIEW vw_pending_orders_today AS
SELECT
  o.id AS order_id,
  u.name AS customer_name,
  u.email,
  o.total,
  o.delivery_address,
  o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'PENDING'
  AND DATE(o.created_at) = CURDATE();

-- Stored Procedure: descontar stock y confirmar pedido (transaccional)
DELIMITER //
CREATE PROCEDURE sp_confirm_order(IN p_order_id INT)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_product_id INT;
  DECLARE v_quantity INT;
  DECLARE cur CURSOR FOR SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  -- Si algo falla (p. ej. stock negativo por el CHECK) se revierte todo
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_product_id, v_quantity;
    IF done THEN LEAVE read_loop; END IF;
    UPDATE stock SET quantity = quantity - v_quantity WHERE product_id = v_product_id;
  END LOOP;
  CLOSE cur;
  UPDATE orders SET status = 'CONFIRMED' WHERE id = p_order_id;
  COMMIT;
END //
DELIMITER ;
