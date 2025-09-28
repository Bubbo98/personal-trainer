const { createClient } = require('@libsql/client');
require('dotenv').config();

async function initTursoDatabase() {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        console.error('Missing Turso credentials. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
        process.exit(1);
    }

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('Initializing Turso database...');
    console.log('URL:', process.env.TURSO_DATABASE_URL);

    try {
        // Create users table
        await client.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE,
                password_hash VARCHAR(255),
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                login_token VARCHAR(500),
                token_expires_at DATETIME
            )
        `);
        console.log('✅ Users table created');

        // Create videos table
        await client.execute(`
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_path VARCHAR(500) NOT NULL,
                duration INTEGER,
                thumbnail_path VARCHAR(500),
                category VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        `);
        console.log('✅ Videos table created');

        // Create user_video_permissions table
        await client.execute(`
            CREATE TABLE IF NOT EXISTS user_video_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                granted_by VARCHAR(100) DEFAULT 'admin',
                expires_at DATETIME,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ User video permissions table created');

        // Create reviews table
        await client.execute(`
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
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Reviews table created');

        // Create access_logs table
        await client.execute(`
            CREATE TABLE IF NOT EXISTS access_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                video_id INTEGER,
                access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                session_duration INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (video_id) REFERENCES videos(id)
            )
        `);
        console.log('✅ Access logs table created');

        // Create indexes
        await client.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        await client.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await client.execute('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)');
        await client.execute('CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved)');
        await client.execute('CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured)');
        console.log('✅ Indexes created');

        // Create admin user
        const bcrypt = require('bcryptjs');
        const adminUsername = process.env.ADMIN_USERNAME || 'joshua_admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);

        await client.execute({
            sql: `
                INSERT OR REPLACE INTO users (username, email, password_hash, first_name, last_name)
                VALUES (?, ?, ?, ?, ?)
            `,
            args: [adminUsername, 'admin@joshuapt.com', hashedPassword, 'Joshua', 'Admin']
        });
        console.log('✅ Admin user created/updated');


        console.log('\n🎉 Turso database initialized successfully!');
        console.log('Your database is ready to use.');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

initTursoDatabase();