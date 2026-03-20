CREATE TABLE IF NOT EXISTS `email_queue` (
  `id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `data` TEXT NOT NULL,
  `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  `attempts` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 3,
  `error` TEXT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `processed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_email_queue_status` (`status`),
  INDEX `idx_email_queue_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
