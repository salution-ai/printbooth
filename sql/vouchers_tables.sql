-- Tạo bảng vouchers để lưu thông tin mã giảm giá
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `type` ENUM('FIXED', 'PERCENTAGE') NOT NULL,
  `value` DECIMAL(10, 2) NOT NULL,
  `min_order_value` DECIMAL(10, 2) DEFAULT 0,
  `max_discount` DECIMAL(10, 2) DEFAULT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `usage_limit` INT DEFAULT NULL,
  `usage_count` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_voucher_code` (`code`),
  INDEX `idx_voucher_dates` (`start_date`, `end_date`),
  INDEX `idx_voucher_active` (`is_active`)
);

-- Tạo bảng voucher_usage để lưu lịch sử sử dụng mã giảm giá
CREATE TABLE IF NOT EXISTS `voucher_usage` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `voucher_id` INT NOT NULL,
  `order_id` VARCHAR(50) NOT NULL,
  `user_email` VARCHAR(255) NOT NULL,
  `discount_amount` DECIMAL(10, 2) NOT NULL,
  `order_total` DECIMAL(10, 2) NOT NULL,
  `used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE CASCADE,
  INDEX `idx_voucher_usage_order` (`order_id`),
  INDEX `idx_voucher_usage_email` (`user_email`)
);

-- Thêm cột voucher_id và discount_amount vào bảng orders nếu chưa có
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `voucher_id` INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `discount_amount` DECIMAL(10, 2) DEFAULT 0,
ADD CONSTRAINT `fk_orders_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE SET NULL;
