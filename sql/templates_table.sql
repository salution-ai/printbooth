-- Add price column to templates table if it doesn't exist
ALTER TABLE templates ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) NOT NULL DEFAULT 99000;
