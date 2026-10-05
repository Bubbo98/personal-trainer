const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

/**
 * Cloudflare R2 (S3 API), one private bucket:
 *   palestra/…, corpoLibero/…        exercise videos (uploaded from the admin's browser)
 *   thumbnails/<videoId>-<ts>.<ext>  video thumbnails
 *   plans/<userId>/…                 plan PDFs           (see services/storedFiles)
 *   body-composition/<userId>/…      body composition reports
 * Clients only get time-limited signed URLs.
 */

const { accountId, accessKeyId, secretAccessKey, bucket: Bucket } = config.r2;
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
});

const THUMBNAIL_PREFIX = 'thumbnails/';

/** Signed GET URL (default 1 hour). */
function getSignedVideoUrl(key, expiresIn = 3600) {
    return getSignedUrl(r2Client, new GetObjectCommand({ Bucket, Key: key }), { expiresIn });
}

/** Signed URL, or null when signing fails (the video is still listed, just not playable). */
async function signedUrlOrNull(key, expiresIn = 3600) {
    if (!key) return null;
    try {
        return await getSignedVideoUrl(key, expiresIn);
    } catch {
        return null;
    }
}

/**
 * Presigned PUTs for uploads straight from the admin's browser. Only Content-Type
 * is signed, so the browser's PUT needs no extra header the bucket's CORS could reject.
 */
function getVideoUploadUrl(key, contentType, expiresIn = 1800) {
    return getSignedUrl(r2Client, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), { expiresIn });
}

function getThumbnailUploadUrl(key, contentType, expiresIn = 600) {
    return getSignedUrl(r2Client, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), { expiresIn });
}

/** True when an object already exists under this key. */
async function objectExists(key) {
    try {
        await r2Client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return true;
    } catch (err) {
        if (err && (err.name === 'NotFound' || (err.$metadata && err.$metadata.httpStatusCode === 404))) return false;
        throw err;
    }
}

/** Server-side upload. Keys are never reused, so the object can be cached forever. */
async function putObject(key, body, contentType) {
    await r2Client.send(new PutObjectCommand({
        Bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'private, max-age=31536000, immutable',
    }));
}

/** Whole object as a Buffer (plan PDFs and reports: a few MB at most). */
async function getObjectBuffer(key) {
    const result = await r2Client.send(new GetObjectCommand({ Bucket, Key: key }));
    return Buffer.from(await result.Body.transformToByteArray());
}

async function deleteObject(key) {
    await r2Client.send(new DeleteObjectCommand({ Bucket, Key: key }));
}

module.exports = {
    THUMBNAIL_PREFIX,
    getSignedVideoUrl,
    signedUrlOrNull,
    getVideoUploadUrl,
    getThumbnailUploadUrl,
    objectExists,
    putObject,
    getObjectBuffer,
    deleteObject,
};
