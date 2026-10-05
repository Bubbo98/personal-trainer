const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { db } = require('../../utils/database');
const { route, id, badRequest, notFound, conflict, isUniqueViolation } = require('../../utils/http');

// Admin: trainers, clients, their login links and individual video permissions
const router = express.Router();

const DEFAULT_TRAINER_ID = 1; // Joshua

/** Dashboard login link (no expiry: links already sent to clients must keep working). */
function loginLink(user) {
    const loginToken = jwt.sign(
        { userId: user.id, username: user.username, email: user.email, type: 'login_link' },
        config.jwtSecret
    );
    return { loginToken, loginUrl: `${config.appUrl}/dashboard/${loginToken}` };
}

const USER_COLUMNS = `u.id, u.username, u.email, u.first_name, u.last_name, u.is_paying, u.checkin_exempt,
    u.is_active, u.trainer_id, u.created_at, u.updated_at, t.name AS trainer_name`;

const findUser = (userId) => db.get(
    `SELECT ${USER_COLUMNS} FROM users u LEFT JOIN trainers t ON t.id = u.trainer_id WHERE u.id = ?`,
    [userId]
);

const toUser = (u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    isPaying: Number(u.is_paying) === 1,
    checkinExempt: Number(u.checkin_exempt) === 1,
    isActive: Number(u.is_active) === 1,
    trainerId: u.trainer_id,
    trainerName: u.trainer_name,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
});

/** A UNIQUE failure on users means a duplicate username or email. */
function duplicateError(err) {
    return conflict(/email/i.test(err.message) ? 'Email already exists' : 'Username already exists');
}

// GET /api/admin/trainers
router.get('/trainers', route(async (req, res) => {
    const trainers = await db.query('SELECT id, name, email, created_at FROM trainers WHERE is_active = 1 ORDER BY id');
    res.json({
        success: true,
        data: { trainers: trainers.map((t) => ({ id: t.id, name: t.name, email: t.email, createdAt: t.created_at })) },
    });
}));

// GET /api/admin/users — active users with their plan, soonest expiry first
router.get('/users', route(async (req, res) => {
    const users = await db.query(`
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.is_active, u.is_paying, u.checkin_exempt,
               u.trainer_id, t.name AS trainer_name, u.created_at, u.last_login,
               (SELECT COUNT(*) FROM user_video_permissions uvp WHERE uvp.user_id = u.id AND uvp.is_active = 1) AS video_count,
               upf.id AS pdf_id, upf.original_name AS pdf_original_name, upf.file_size AS pdf_file_size,
               upf.mime_type AS pdf_mime_type, upf.uploaded_at AS pdf_uploaded_at, upf.uploaded_by AS pdf_uploaded_by,
               upf.updated_at AS pdf_updated_at, upf.duration_months AS pdf_duration_months,
               upf.duration_days AS pdf_duration_days, upf.expiration_date AS pdf_expiration_date
        FROM users u
        LEFT JOIN trainers t ON t.id = u.trainer_id
        LEFT JOIN user_pdf_files upf ON upf.user_id = u.id
        WHERE u.is_active = 1
        ORDER BY upf.expiration_date IS NULL, upf.expiration_date, u.created_at DESC
    `);

    res.json({
        success: true,
        data: {
            users: users.map((u) => ({
                id: u.id,
                username: u.username,
                email: u.email,
                firstName: u.first_name,
                lastName: u.last_name,
                isActive: Number(u.is_active) === 1,
                isPaying: Number(u.is_paying) === 1,
                checkinExempt: Number(u.checkin_exempt) === 1,
                trainerId: u.trainer_id,
                trainerName: u.trainer_name,
                createdAt: u.created_at,
                lastLogin: u.last_login,
                videoCount: u.video_count,
                pdf: u.pdf_id ? {
                    id: u.pdf_id,
                    userId: u.id,
                    originalName: u.pdf_original_name,
                    fileSize: u.pdf_file_size,
                    mimeType: u.pdf_mime_type,
                    uploadedAt: u.pdf_uploaded_at,
                    uploadedBy: u.pdf_uploaded_by,
                    updatedAt: u.pdf_updated_at,
                    durationMonths: u.pdf_duration_months,
                    durationDays: u.pdf_duration_days,
                    expirationDate: u.pdf_expiration_date,
                } : null,
            })),
            totalCount: users.length,
        },
    });
}));

// POST /api/admin/users — creates a user, or reactivates a deactivated one with the same username
// Body: { username, email?, password?, firstName?, lastName?, isPaying? (default true), trainerId? }
router.post('/users', route(async (req, res) => {
    const { username, email, password, firstName, lastName, isPaying, trainerId } = req.body;
    if (!username) throw badRequest('Username is required');

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const fields = [email || null, firstName, lastName, isPaying === undefined || isPaying ? 1 : 0, trainerId || DEFAULT_TRAINER_ID];

    let userId;
    let reactivated = false;
    try {
        const inactive = await db.get('SELECT id FROM users WHERE username = ? AND is_active = 0', [username]);
        if (inactive) {
            await db.batch([
                {
                    sql: `UPDATE users SET email = ?, first_name = ?, last_name = ?, is_paying = ?, trainer_id = ?,
                            password_hash = COALESCE(?, password_hash), is_active = 1, updated_at = CURRENT_TIMESTAMP
                          WHERE id = ?`,
                    params: [...fields, passwordHash, inactive.id],
                },
                { sql: 'UPDATE user_video_permissions SET is_active = 1 WHERE user_id = ?', params: [inactive.id] },
            ]);
            userId = inactive.id;
            reactivated = true;
        } else {
            userId = (await db.run(
                `INSERT INTO users (email, first_name, last_name, is_paying, trainer_id, username, password_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [...fields, username, passwordHash]
            )).lastId;
        }
    } catch (err) {
        if (isUniqueViolation(err)) throw duplicateError(err);
        throw err;
    }

    const user = await findUser(userId);
    const { isActive, checkinExempt, updatedAt, ...created } = toUser(user);
    res.status(201).json({
        success: true,
        message: reactivated ? 'User reactivated successfully' : 'User created successfully',
        data: { user: created, ...loginLink(user), ...(reactivated ? { reactivated: true } : {}) },
    });
}));

// PUT /api/admin/users/:id — partial update
// Body: any of { firstName, lastName, email ('' clears it), isPaying, checkinExempt, trainerId }
router.put('/users/:id', route(async (req, res) => {
    const userId = id(req.params.id, 'user ID');
    const columns = {
        firstName: ['first_name', (v) => v],
        lastName: ['last_name', (v) => v],
        email: ['email', (v) => (v === '' ? null : v)],
        isPaying: ['is_paying', (v) => (v ? 1 : 0)],
        checkinExempt: ['checkin_exempt', (v) => (v ? 1 : 0)],
        trainerId: ['trainer_id', (v) => v],
    };
    const updates = Object.entries(columns).filter(([field]) => req.body[field] !== undefined);
    if (updates.length === 0) throw badRequest('No fields to update');

    try {
        const { changes } = await db.run(
            `UPDATE users SET ${updates.map(([, [column]]) => `${column} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND is_active = 1`,
            [...updates.map(([field, [, convert]]) => convert(req.body[field])), userId]
        );
        if (changes === 0) throw notFound('User not found or inactive');
    } catch (err) {
        if (isUniqueViolation(err)) throw conflict('Email già in uso da un altro utente');
        throw err;
    }

    res.json({ success: true, message: 'User updated successfully', data: { user: toUser(await findUser(userId)) } });
}));

// DELETE /api/admin/users/:id — deactivates the user and their video permissions
// (the nightly cleanup deletes deactivated users for good, see utils/userRetention)
router.delete('/users/:id', route(async (req, res) => {
    const userId = id(req.params.id, 'user ID');
    const [{ changes }] = await db.batch([
        { sql: 'UPDATE users SET is_active = 0 WHERE id = ?', params: [userId] },
        { sql: 'UPDATE user_video_permissions SET is_active = 0 WHERE user_id = ?', params: [userId] },
    ]);
    if (changes === 0) throw notFound('User not found');
    res.json({ success: true, message: 'User deleted successfully' });
}));

// POST /api/admin/users/:id/generate-link
router.post('/users/:id/generate-link', route(async (req, res) => {
    const user = await db.get(
        'SELECT id, username, email, first_name, last_name FROM users WHERE id = ? AND is_active = 1',
        [id(req.params.id, 'user ID')]
    );
    if (!user) throw notFound('User not found');
    res.json({
        success: true,
        message: 'Login link generated successfully',
        data: {
            user: { id: user.id, username: user.username, email: user.email, firstName: user.first_name, lastName: user.last_name },
            ...loginLink(user),
        },
    });
}));

// GET /api/admin/users/:id/videos — videos the user can watch
router.get('/users/:id/videos', route(async (req, res) => {
    const videos = await db.query(
        `SELECT v.id, v.title, v.description, v.file_path, v.duration, v.category, uvp.granted_at, uvp.expires_at
         FROM videos v JOIN user_video_permissions uvp ON uvp.video_id = v.id
         WHERE uvp.user_id = ? AND v.is_active = 1 AND uvp.is_active = 1
         ORDER BY uvp.granted_at DESC`,
        [id(req.params.id, 'user ID')]
    );
    res.json({
        success: true,
        data: {
            videos: videos.map((v) => ({
                id: v.id, title: v.title, description: v.description, filePath: v.file_path,
                duration: v.duration, category: v.category, grantedAt: v.granted_at, expiresAt: v.expires_at,
            })),
        },
    });
}));

// POST /api/admin/users/:userId/videos/:videoId — grants access (Body: { expiresAt? })
router.post('/users/:userId/videos/:videoId', route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    const videoId = id(req.params.videoId, 'video ID');
    const expiresAt = req.body.expiresAt || null;

    const [user, video, permission] = await Promise.all([
        db.get('SELECT id FROM users WHERE id = ? AND is_active = 1', [userId]),
        db.get('SELECT id FROM videos WHERE id = ? AND is_active = 1', [videoId]),
        db.get('SELECT id, is_active FROM user_video_permissions WHERE user_id = ? AND video_id = ?', [userId, videoId]),
    ]);
    if (!user) throw notFound('User not found');
    if (!video) throw notFound('Video not found');
    if (permission && Number(permission.is_active)) throw badRequest('User already has access to this video');

    if (permission) {
        await db.run(
            'UPDATE user_video_permissions SET is_active = 1, granted_by = ?, expires_at = ? WHERE id = ?',
            [req.user.username, expiresAt, permission.id]
        );
    } else {
        await db.run(
            'INSERT INTO user_video_permissions (user_id, video_id, granted_by, expires_at, is_active) VALUES (?, ?, ?, ?, 1)',
            [userId, videoId, req.user.username, expiresAt]
        );
    }
    res.json({
        success: true,
        message: 'Video access granted successfully',
        data: { userId, videoId, expiresAt, grantedBy: req.user.username, grantedAt: new Date().toISOString() },
    });
}));

// DELETE /api/admin/users/:userId/videos/:videoId — revokes access and removes the video from the user's days
router.delete('/users/:userId/videos/:videoId', route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    const videoId = id(req.params.videoId, 'video ID');
    const [, { changes }] = await db.batch([
        {
            sql: `DELETE FROM training_day_videos
                  WHERE video_id = ? AND training_day_id IN (SELECT id FROM user_training_days WHERE user_id = ?)`,
            params: [videoId, userId],
        },
        { sql: 'UPDATE user_video_permissions SET is_active = 0 WHERE user_id = ? AND video_id = ?', params: [userId, videoId] },
    ]);
    if (changes === 0) throw notFound('Permission not found');
    res.json({ success: true, message: 'Video access revoked successfully' });
}));

module.exports = router;
