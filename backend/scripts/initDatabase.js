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

console.log('Initializing database...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log(`Connected to SQLite database: ${dbPath}`);
});

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

    // Insert sample videos
    const sampleVideos = [
        {
            title: 'Introduzione al Calisthenics',
            description: 'Video introduttivo sui movimenti base del calisthenics',
            file_path: 'calisthenics/intro.mp4',
            category: 'calisthenics',
            duration: 900 // 15 minutes
        },
        {
            title: 'Workout Completo Corpo Libero',
            description: 'Allenamento completo utilizzando solo il peso corporeo',
            file_path: 'bodyweight/full-workout.mp4',
            category: 'bodyweight',
            duration: 1800 // 30 minutes
        },
        {
            title: 'Stretching Post Allenamento',
            description: 'Routine di stretching da fare dopo ogni allenamento',
            file_path: 'recovery/post-workout-stretch.mp4',
            category: 'recovery',
            duration: 600 // 10 minutes
        }
    ];

    sampleVideos.forEach((video) => {
        db.run(`
            INSERT OR REPLACE INTO videos (title, description, file_path, category, duration)
            VALUES (?, ?, ?, ?, ?)
        `, [video.title, video.description, video.file_path, video.category, video.duration], function(err) {
            if (err) {
                console.error(`Error inserting video "${video.title}":`, err.message);
            } else {
                console.log(`Inserted sample video: ${video.title}`);
            }
        });
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