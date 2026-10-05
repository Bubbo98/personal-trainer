-- Migration: Add Training Days System
-- This adds support for organizing user videos into customizable training days

-- Table: user_training_days
-- Stores training day definitions for each user
CREATE TABLE IF NOT EXISTS user_training_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL, -- Sequential day number (1, 2, 3, ...)
    day_name VARCHAR(100), -- Optional custom name (e.g., "Upper Body", "Legs", etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, day_number) -- Each user can have only one day with a specific number
);

-- Table: training_day_videos
-- Stores videos assigned to each training day with their order
CREATE TABLE IF NOT EXISTS training_day_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    training_day_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0, -- Order of video within the day (0, 1, 2, ...)
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by VARCHAR(100) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (training_day_id) REFERENCES user_training_days(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(training_day_id, video_id) -- Each video can appear only once per day
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_training_days_user ON user_training_days(user_id);
CREATE INDEX IF NOT EXISTS idx_training_days_active ON user_training_days(is_active);
CREATE INDEX IF NOT EXISTS idx_training_day_videos_day ON training_day_videos(training_day_id);
CREATE INDEX IF NOT EXISTS idx_training_day_videos_video ON training_day_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_training_day_videos_order ON training_day_videos(order_index);

-- Note: The old user_video_permissions table remains for backwards compatibility
-- Videos can be assigned either to training days OR directly to users (legacy mode)
