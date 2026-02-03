-- Personal Trainer App Database Schema
-- SQLite Database for User Authentication and Video Access Control

-- Users table - stores user credentials and info
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT 1,
    is_paying BOOLEAN DEFAULT 1,
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

-- Reviews table - stores user reviews and testimonials
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    approved_at DATETIME,
    approved_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id) -- One review per user
);

-- User PDF Files - stores training plans/schedules for each user
CREATE TABLE IF NOT EXISTS user_pdf_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- path relative to public/pdf/
    file_size INTEGER NOT NULL, -- in bytes
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100) DEFAULT 'admin',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id) -- One PDF per user
);

-- User Feedbacks - stores weekly check-in forms
CREATE TABLE IF NOT EXISTS user_feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    feedback_date DATE NOT NULL,
    -- Weekly check-in fields (8 questions)
    energy_level VARCHAR(20) NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
    workouts_completed VARCHAR(30) NOT NULL CHECK (workouts_completed IN ('all', 'almost_all', 'few_or_none')),
    meal_plan_followed VARCHAR(30) NOT NULL CHECK (meal_plan_followed IN ('completely', 'mostly', 'sometimes', 'no')),
    sleep_quality VARCHAR(20) NOT NULL CHECK (sleep_quality IN ('excellent', 'good', 'fair', 'poor')),
    physical_discomfort VARCHAR(30) NOT NULL CHECK (physical_discomfort IN ('none', 'minor', 'significant')),
    motivation_level VARCHAR(20) NOT NULL CHECK (motivation_level IN ('very_high', 'good', 'medium', 'low')),
    weekly_highlights TEXT,
    current_weight DECIMAL(5,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pdf_change_date DATETIME, -- Date when the PDF was changed that triggered this feedback
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_login_token ON users(login_token);
CREATE INDEX IF NOT EXISTS idx_users_is_paying ON users(is_paying);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_user_video_permissions_user ON user_video_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_permissions_video ON user_video_permissions(video_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_video ON access_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_time ON access_logs(access_time);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_user_pdf_files_user ON user_pdf_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_user ON user_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_date ON user_feedbacks(feedback_date);