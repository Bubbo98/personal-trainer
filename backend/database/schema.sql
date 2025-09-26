-- Personal Trainer App Database Schema
-- SQLite Database for User Authentication and Video Access Control

-- Users table - stores user credentials and info
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    login_token VARCHAR(500),
    token_expires_at DATETIME
);

-- Videos table - stores video metadata
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL, -- path relative to public/videos/
    duration INTEGER, -- in seconds
    thumbnail_path VARCHAR(500), -- path to thumbnail image
    category VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- User Video Permissions - many-to-many relationship
CREATE TABLE IF NOT EXISTS user_video_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(100) DEFAULT 'admin',
    expires_at DATETIME, -- optional expiration date
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
);

-- Access Logs - track video access for analytics
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    video_id INTEGER,
    access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_duration INTEGER, -- in seconds
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_login_token ON users(login_token);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_user_video_permissions_user ON user_video_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_permissions_video ON user_video_permissions(video_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_video ON access_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_time ON access_logs(access_time);