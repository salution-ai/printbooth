-- Thêm các cột giá mới nếu chưa tồn tại
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS download_price DECIMAL(10,2) DEFAULT 49000,
ADD COLUMN IF NOT EXISTS download_sale_price DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS print_price DECIMAL(10,2) DEFAULT 99000,
ADD COLUMN IF NOT EXISTS print_sale_price DECIMAL(10,2) DEFAULT NULL;

-- Cập nhật giá mặc định từ giá hiện tại
UPDATE templates
SET download_price = price / 2,
    print_price = price
WHERE download_price IS NULL OR print_price IS NULL;
