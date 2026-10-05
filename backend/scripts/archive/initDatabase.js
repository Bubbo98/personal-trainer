const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './database/app.db';
const schemaPath = path.join(__dirname, '../database/schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
}

console.log('Checking database...');

// Check if database already exists and has tables
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log(`Connected to SQLite database: ${dbPath}`);

    // Check if users table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (row) {
            console.log('Database already initialized, skipping schema creation');
            // Just ensure admin user exists with correct password
            ensureAdminUser(db);
            return;
        } else {
            console.log('Database not initialized, creating schema...');
            initializeDatabase(db);
        }
    });
});

// Function to ensure admin user exists with correct password
function ensureAdminUser(db) {
    const adminUsername = process.env.ADMIN_USERNAME || 'joshua_admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    db.run(`
        INSERT OR REPLACE INTO users (username, email, password_hash, first_name, last_name)
        VALUES (?, ?, ?, ?, ?)
    `, [
        adminUsername,
        'admin@joshuapt.com',
        hashedPassword,
        'Joshua',
        'Admin'
    ], function(err) {
        if (err) {
            console.error('Error creating/updating admin user:', err.message);
        } else {
            console.log('Admin user ensured with correct password');
        }
        db.close();
        process.exit(0);
    });
}

// Function to initialize database with schema and sample data
function initializeDatabase(db) {
    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

    // Execute each statement
    db.serialize(() => {
    statements.forEach((statement, index) => {
        db.run(statement, (err) => {
            if (err) {
                console.error(`Error executing statement ${index + 1}:`, err.message);
            } else {
                console.log(`Executed statement ${index + 1}/${statements.length}`);
            }
        });
    });

    // Insert sample data after schema creation
    console.log('Inserting sample data...');

    // Create admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    db.run(`
        INSERT OR REPLACE INTO users (username, email, password_hash, first_name, last_name)
        VALUES (?, ?, ?, ?, ?)
    `, [
        process.env.ADMIN_USERNAME || 'admin',
        'admin@joshuapt.com',
        hashedPassword,
        'Joshua',
        'Admin'
    ], function(err) {
        if (err) {
            console.error('Error creating admin user:', err.message);
        } else {
            console.log('Admin user created/updated successfully');
        }
    });


    console.log('Database initialization completed!');

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
    });
}