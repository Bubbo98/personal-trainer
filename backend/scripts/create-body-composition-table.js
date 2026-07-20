#!/usr/bin/env node
const { createDatabase } = require('../utils/database');
const db = createDatabase();

const sql = `CREATE TABLE IF NOT EXISTS body_composition_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    measurement_date TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_data TEXT NOT NULL,
    parsed_data TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

db.runCallback(sql, [], (err) => {
    if (err) { console.error('❌', err.message); process.exit(1); }
    console.log('✅ body_composition_reports table created');
    db.close();
});
