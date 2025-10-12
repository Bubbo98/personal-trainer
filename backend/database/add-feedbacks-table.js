const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'app.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

const createFeedbacksTable = `
-- User Feedbacks - stores coaching feedback forms
CREATE TABLE IF NOT EXISTS user_feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    feedback_date DATE NOT NULL,
    training_satisfaction INTEGER NOT NULL CHECK (training_satisfaction >= 1 AND training_satisfaction <= 10),
    motivation_level INTEGER NOT NULL CHECK (motivation_level >= 1 AND motivation_level <= 10),
    difficulties TEXT,
    nutrition_quality VARCHAR(50) NOT NULL CHECK (nutrition_quality IN ('ottima', 'buona', 'da_migliorare', 'difficolta')),
    sleep_hours INTEGER NOT NULL,
    recovery_improved BOOLEAN NOT NULL,
    feels_supported BOOLEAN NOT NULL,
    support_improvement TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pdf_change_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_user ON user_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_date ON user_feedbacks(feedback_date);
`;

db.serialize(() => {
  // Create feedbacks table
  db.run(createFeedbacksTable, (err) => {
    if (err) {
      console.error('Error creating user_feedbacks table:', err);
    } else {
      console.log('✓ user_feedbacks table created successfully');
    }
  });

  // Create indexes
  db.exec(createIndexes, (err) => {
    if (err) {
      console.error('Error creating indexes:', err);
    } else {
      console.log('✓ Indexes created successfully');
    }
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
      process.exit(1);
    }
    console.log('✓ Database migration completed successfully!');
    console.log('The user_feedbacks table has been added to the database.');
  });
});
