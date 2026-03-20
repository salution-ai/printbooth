-- Tạo bảng orders để lưu thông tin đơn hàng
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address VARCHAR(255),
  customer_city VARCHAR(100),
  customer_note TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('bank', 'cod') NOT NULL,
  delivery_option ENUM('download', 'print') NOT NULL,
  include_download BOOLEAN NOT NULL DEFAULT TRUE,
  payment_status ENUM('pending', 'paid', 'cod_pending', 'failed') NOT NULL DEFAULT 'pending',
  order_status ENUM('pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_number (order_number),
  INDEX idx_customer_email (customer_email),
  INDEX idx_payment_status (payment_status),
  INDEX idx_order_status (order_status)
);

-- Tạo bảng order_items để lưu chi tiết các sản phẩm trong đơn hàng
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  template_id VARCHAR(36) NOT NULL,
  preview_url TEXT,
  image_urls JSON,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id)
);

-- Tạo bảng order_transactions để lưu thông tin giao dịch thanh toán
CREATE TABLE IF NOT EXISTS order_transactions (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  transaction_id VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
  transaction_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_transaction_id (transaction_id)
);

-- Tạo bảng order_status_history để lưu lịch sử trạng thái đơn hàng
CREATE TABLE IF NOT EXISTS order_status_history (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled') NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id)
);
