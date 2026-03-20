-- Bảng lưu thông tin người dùng admin
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng lưu thông tin templates
CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slots INT NOT NULL,
  image VARCHAR(255) NOT NULL,
  frame_image VARCHAR(255) NOT NULL,
  frame_url VARCHAR(255),
  aspect_ratio FLOAT DEFAULT 1.0,
  price DECIMAL(10,2) NOT NULL DEFAULT 99000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng lưu thông tin layout của templates
CREATE TABLE IF NOT EXISTS template_layouts (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  slot_id VARCHAR(36) NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  custom_position BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- Bảng lưu thông tin categories
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng quan hệ nhiều-nhiều giữa templates và categories
CREATE TABLE IF NOT EXISTS template_categories (
  template_id VARCHAR(36) NOT NULL,
  category_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (template_id, category_id),
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Thêm dữ liệu mẫu cho admin user
INSERT INTO admin_users (id, username, password, name, email)
VALUES (UUID(), 'admin', '$2b$10$XdUFJeGJgvCzVRKTx9l.7OJVmb7WZJfFZ1vYZ5XmgkW9bYL1tBgDe', 'Admin User', 'admin@photolab.com')
ON DUPLICATE KEY UPDATE username = VALUES(username);

-- Thêm dữ liệu mẫu cho categories
INSERT INTO categories (id, name) VALUES 
(UUID(), 'basic'),
(UUID(), 'single'),
(UUID(), 'double'),
(UUID(), 'multiple'),
(UUID(), 'creative'),
(UUID(), 'seasonal'),
(UUID(), 'festival'),
(UUID(), 'popular'),
(UUID(), 'wedding'),
(UUID(), 'birthday'),
(UUID(), 'holiday')
ON DUPLICATE KEY UPDATE name = VALUES(name);
