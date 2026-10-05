const crypto = require('crypto');
const path = require('path');
const r2 = require('../utils/r2');

/**
 * Client files (plan PDFs, body composition reports) live on R2 under a private
 * key saved in the row's file_key. Rows from before the move still hold the file
 * as base64 in file_data: reads fall back to it until scripts/move-files-to-r2.js
 * has copied it.
 */

const FOLDERS = { plan: 'plans', report: 'body-composition' };

/** Uploads the file; returns its new key (unique per upload, the name is kept for humans). */
async function storeFile(kind, userId, file) {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '') || '.bin';
    const key = `${FOLDERS[kind]}/${userId}/${Date.now()}-${crypto.randomUUID()}${ext}`;
    await r2.putObject(key, file.buffer, file.mimetype);
    return key;
}

/**
 * Uploads the file, then runs save(key) (the row's write); if save fails the
 * upload is deleted, so R2 never keeps files no row points to.
 */
async function storeFileFor(kind, userId, file, save) {
    const key = await storeFile(kind, userId, file);
    try {
        return await save(key);
    } catch (err) {
        await deleteFiles([key]);
        throw err;
    }
}

/** The file of a row with file_key / file_data. */
async function readFile(row) {
    if (row.file_key) return r2.getObjectBuffer(row.file_key);
    return Buffer.from(row.file_data || '', 'base64');
}

/** Deletes objects no longer referenced; failures are logged, never thrown (the row is gone already). */
async function deleteFiles(keys) {
    await Promise.all(keys.filter(Boolean).map((key) =>
        r2.deleteObject(key).catch((err) => console.error(`R2 delete of ${key} failed:`, err.message))
    ));
}

module.exports = { storeFile, storeFileFor, readFile, deleteFiles };
