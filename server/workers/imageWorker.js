const { Worker } = require('bullmq');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Issue = require('../models/Issue');
const { checkRedisVersion } = require('../utils/redisCheck');
const { getQueue } = require('../utils/queueFallback');
const cloudinary = require('cloudinary').v2;

// Cloudinary config (it will automatically pick up CLOUDINARY_URL if in .env)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const setupImageWorker = (connection) => {
  const handler = async (job) => {
    const { buffer, filename, issueId } = job.data;
    const uploadDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const outPath = path.join(uploadDir, filename);
    const imgBuffer = Buffer.from(buffer, 'base64');

    try {
      const optimizedBuffer = await sharp(imgBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      let imageUrl;

      if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'civicpulse_issues', public_id: filename.split('.')[0] },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(optimizedBuffer);
        });
        imageUrl = uploadResult.secure_url;
      } else {
        // Fallback to local FS
        fs.writeFileSync(outPath, optimizedBuffer);
        imageUrl = `/uploads/${filename}`;
      }

      if (issueId) {
        await Issue.findByIdAndUpdate(issueId, {
          $push: { images: imageUrl }
        });
      }

      console.log(`[imageWorker] Processed ${filename} for issue ${issueId} -> ${imageUrl}`);
      return { url: imageUrl };
    } catch (error) {
      console.error(`[imageWorker] Error processing ${filename}:`, error);
      throw error;
    }
  };

  // Register with fallback queue for synchronous execution if needed
  getQueue('image-compression', { connection }).registerHandler(handler);

  // Return real worker only if compatible
  return {
    init: async () => {
      const compatible = await checkRedisVersion();
      if (compatible) {
        return new Worker('image-compression', handler, { connection });
      }
      console.warn('[imageWorker] Skipping real Worker due to Redis incompatibility');
      return { close: async () => {} };
    }
  };
};

module.exports = setupImageWorker;
