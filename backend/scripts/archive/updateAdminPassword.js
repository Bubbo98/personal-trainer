const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './database/app.db';

console.log('Updating admin password...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log(`Connected to SQLite database: ${dbPath}`);
});

// Update admin password - Set these in environment variables
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminUsername || !adminPassword) {
    console.error('Error: ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables');
    process.exit(1);
}

const hashedPassword = bcrypt.hashSync(adminPassword, 10);

console.log(`Updating password for user: ${adminUsername}`);

db.run(`
    UPDATE users SET password_hash = ? WHERE username = ?
`, [hashedPassword, adminUsername], function(err) {
    if (err) {
        console.error('Error updating admin password:', err.message);
    } else if (this.changes === 0) {
        console.log('No user found with that username. Creating new admin user...');

        // Create admin user if doesn't exist
        db.run(`
            INSERT INTO users (username, email, password_hash, first_name, last_name)
            VALUES (?, ?, ?, ?, ?)
        `, [
            adminUsername,
            'admin@joshuapt.com',
            hashedPassword,
            'Joshua',
            'Admin'
        ], function(err) {
            if (err) {
                console.error('Error creating admin user:', err.message);
            } else {
                console.log('Admin user created successfully');
            }
            db.close();
            process.exit(0);
        });
    } else {
        console.log('Admin password updated successfully');
        db.close();
        process.exit(0);
    }
});