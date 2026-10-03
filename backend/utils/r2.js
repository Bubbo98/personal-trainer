const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// R2 Configuration - Set these in environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn('Warning: R2 credentials not fully configured. Video streaming may not work.');
}

// Create S3 client for R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a signed URL for a video file in R2
 * @param {string} videoKey - The key/path of the video in R2 (e.g., "corpoLibero/Pull up.MOV")
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} - The signed URL
 */
async function getSignedVideoUrl(videoKey, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: videoKey,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL for', videoKey, ':', error);
    throw error;
  }
}

/**
 * Generate signed URLs for multiple videos
 * @param {string[]} videoKeys - Array of video keys
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<Object>} - Object mapping video keys to signed URLs
 */
async function getSignedVideoUrls(videoKeys, expiresIn = 3600) {
  const urlPromises = videoKeys.map(async (key) => {
    try {
      const url = await getSignedVideoUrl(key, expiresIn);
      return { key, url };
    } catch (error) {
      console.error(`Failed to generate URL for ${key}:`, error.message);
      return { key, url: null };
    }
  });

  const results = await Promise.all(urlPromises);

  // Convert array to object for easier lookup
  const urlMap = {};
  results.forEach(({ key, url }) => {
    urlMap[key] = url;
  });

  return urlMap;
}

// ── Thumbnails (stored under "thumbnails/" in the same bucket) ──────────────

const THUMBNAIL_PREFIX = 'thumbnails/';

/** Presigned PUT URL so the admin's browser uploads a thumbnail straight to R2. */
async function getThumbnailUploadUrl(key, contentType, expiresIn = 600) {
  // Only Content-Type is signed (like video uploads), so the browser's PUT
  // needs no extra headers that the bucket's CORS rules might reject
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/** Server-side upload (used by the migration script). */
async function putObject(key, body, contentType) {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

async function deleteObject(key) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}

module.exports = {
  getSignedVideoUrl,
  getSignedVideoUrls,
  getThumbnailUploadUrl,
  putObject,
  deleteObject,
  THUMBNAIL_PREFIX,
  r2Client,
};
