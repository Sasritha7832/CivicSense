// Reserved for future use. imageWorker currently uses local sharp.
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage for multer (we'll stream to Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Upload a buffer to Cloudinary
 */
const uploadToCloudinary = (buffer, folder = 'civic-issues') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Upload multiple files from req.files
 */
const uploadMultipleImages = async (files) => {
  const uploads = files.map((file) => uploadToCloudinary(file.buffer));
  const results = await Promise.all(uploads);
  return results.map((r) => r.secure_url);
};

/**
 * Delete image from Cloudinary by URL
 */
const deleteFromCloudinary = async (url) => {
  const publicId = url.split('/').slice(-2).join('/').split('.')[0];
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { upload, uploadToCloudinary, uploadMultipleImages, deleteFromCloudinary };
