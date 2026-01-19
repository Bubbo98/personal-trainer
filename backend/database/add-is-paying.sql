-- Add is_paying column to users table
-- Migration: Add payment status to track paying vs non-paying users
--
-- Run this migration with:
-- sqlite3 database/app.db < database/add-is-paying.sql
--
-- Or for Turso:
-- turso db shell <db-name> < database/add-is-paying.sql

-- Add is_paying column (default TRUE for existing users)
ALTER TABLE users ADD COLUMN is_paying BOOLEAN DEFAULT 1;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_is_paying ON users(is_paying);

-- Update existing users to be paying by default (you can change this manually if needed)
UPDATE users SET is_paying = 1 WHERE is_paying IS NULL;
