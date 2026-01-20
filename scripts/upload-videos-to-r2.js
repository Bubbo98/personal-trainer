const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// R2 Configuration - Set these in environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Error: R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in environment variables.');
  process.exit(1);
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

// Function to upload a single file
async function uploadFile(filePath, key) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = filePath.endsWith('.MOV') || filePath.endsWith('.mov')
      ? 'video/quicktime'
      : 'video/mp4';

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    });

    await r2Client.send(command);
    console.log(`✅ Uploaded: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to upload ${key}:`, error.message);
  }
}

// Function to recursively find all video files
function findVideoFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Recursively search subdirectories
      results = results.concat(findVideoFiles(filePath, baseDir));
    } else if (file.match(/\.(mov|MOV|mp4|MP4)$/)) {
      // Get relative path from base directory
      const relativePath = path.relative(baseDir, filePath);
      results.push({
        filePath,
        key: relativePath.replace(/\\/g, '/'), // Ensure forward slashes for R2
      });
    }
  });

  return results;
}

// Main upload function
async function uploadAllVideos() {
  console.log('🚀 Starting video upload to Cloudflare R2...\n');

  const videosDir = path.join(__dirname, '../public/videos');

  if (!fs.existsSync(videosDir)) {
    console.error('❌ Videos directory not found:', videosDir);
    return;
  }

  // Find all video files
  const videoFiles = findVideoFiles(videosDir);
  console.log(`📹 Found ${videoFiles.length} video files to upload\n`);

  // Upload each file
  let successCount = 0;
  let failCount = 0;

  for (const { filePath, key } of videoFiles) {
    try {
      await uploadFile(filePath, key);
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  console.log('\n📊 Upload Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Total: ${videoFiles.length}`);
  console.log('\n✨ Upload complete!');
}

// Check if videos already exist in R2
async function checkExistingVideos() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 10,
    });

    const response = await r2Client.send(command);
    console.log(`\n📦 Found ${response.Contents?.length || 0} existing files in R2 bucket`);

    if (response.Contents && response.Contents.length > 0) {
      console.log('\nFirst few files:');
      response.Contents.slice(0, 5).forEach((item) => {
        console.log(`   - ${item.Key}`);
      });
    }
  } catch (error) {
    console.error('❌ Error checking R2 bucket:', error.message);
  }
}

// Run the upload
async function main() {
  console.log('🔍 Checking R2 connection...');
  await checkExistingVideos();

  console.log('\n' + '='.repeat(50));
  const answer = await new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('\n⚠️  This will upload all videos to R2. Continue? (yes/no): ', (ans) => {
      readline.close();
      resolve(ans.toLowerCase());
    });
  });

  if (answer === 'yes' || answer === 'y') {
    await uploadAllVideos();
  } else {
    console.log('❌ Upload cancelled');
  }
}

main();
