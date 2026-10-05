/**
 * Every setting the backend reads from the environment, in one place
 * (backend/.env locally, Vercel's environment variables in production).
 * Modules import this object instead of reading process.env.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const env = process.env;
const isProduction = env.NODE_ENV === 'production';

const list = (value, fallback) => (value || fallback).split(',').map((s) => s.trim()).filter(Boolean);

const config = {
    env: env.NODE_ENV || 'development',
    isProduction,
    port: Number(env.PORT) || 3001,
    // Deployed commit (set by Vercel): tells which code is live after a push
    version: (env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),

    // Public site: login links, emails, sitemap
    appUrl: (env.PUBLIC_APP_URL || 'https://www.esercizifacili.com').replace(/\/$/, ''),
    corsOrigins: list(env.CORS_ORIGINS,
        'http://localhost:3000,https://personal-trainer-prod.vercel.app,https://esercizifacili.com,https://www.esercizifacili.com,https://app.esercizifacili.com'),

    jwtSecret: env.JWT_SECRET,
    adminUsername: env.ADMIN_USERNAME || 'admin',
    cronSecret: env.CRON_SECRET,

    database: {
        // Turso in production; a local SQLite file otherwise
        url: env.TURSO_DATABASE_URL || `file:${env.DB_PATH || './database/app.db'}`,
        authToken: env.TURSO_AUTH_TOKEN,
    },

    r2: {
        accountId: env.R2_ACCOUNT_ID,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucket: env.R2_BUCKET_NAME,
    },

    email: {
        resendApiKey: env.RESEND_API_KEY,
        adminEmail: env.ADMIN_EMAIL,
        from: env.FROM_EMAIL || 'EserciziFacili <noreply@esercizifacili.com>',
    },

    // Never deleted by the nightly cleanup (default: Test User)
    retentionProtectedUserIds: list(env.RETENTION_PROTECTED_USER_IDS, '165').map(Number).filter(Number.isInteger),
};

// Fail at boot rather than on the first request
const missing = [];
if (!config.jwtSecret) missing.push('JWT_SECRET');
if (isProduction && !env.TURSO_DATABASE_URL) missing.push('TURSO_DATABASE_URL');
if (isProduction && !config.database.authToken) missing.push('TURSO_AUTH_TOKEN');
if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

for (const [name, value] of Object.entries({ R2_ACCOUNT_ID: config.r2.accountId, R2_BUCKET_NAME: config.r2.bucket, RESEND_API_KEY: config.email.resendApiKey })) {
    if (!value && config.env !== 'test') console.warn(`${name} not set: the features that need it are disabled`);
}

module.exports = config;
