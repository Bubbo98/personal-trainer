-- Migration: Add Trainers System
-- This adds support for multiple personal trainers and assigns clients to trainers

-- Table: trainers
-- Stores personal trainer information
CREATE TABLE IF NOT EXISTS trainers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default trainers (Joshua and Denise)
INSERT OR IGNORE INTO trainers (name, email) VALUES ('Joshua', NULL);
INSERT OR IGNORE INTO trainers (name, email) VALUES ('Denise', NULL);

-- Add trainer_id column to users table
-- Default to 1 (Joshua) for existing users
ALTER TABLE users ADD COLUMN trainer_id INTEGER REFERENCES trainers(id) DEFAULT 1;

-- Update all existing users to be assigned to Joshua (trainer_id = 1)
UPDATE users SET trainer_id = 1 WHERE trainer_id IS NULL;

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_trainer ON users(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainers_active ON trainers(is_active);
