-- Tạo bảng payment_transactions nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  transaction_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_order_id (order_id),
  INDEX idx_transaction_id (transaction_id),
  CONSTRAINT payment_transactions_ibfk_1 FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
