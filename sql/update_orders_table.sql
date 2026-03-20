-- Cập nhật bảng orders để thêm các trường liên quan đến voucher
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `voucher_id` INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `discount_amount` DECIMAL(10, 2) DEFAULT 0,
ADD CONSTRAINT `fk_orders_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE SET NULL;
