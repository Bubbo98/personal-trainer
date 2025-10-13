const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'REMOVED_ACCOUNT_ID';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'REMOVED_ACCESS_KEY';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'REMOVED_SECRET';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'personal-trainer-videos';

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

module.exports = {
  getSignedVideoUrl,
  getSignedVideoUrls,
  r2Client,
};
