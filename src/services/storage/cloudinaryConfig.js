const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createStorage = (folder, allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif']) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `zentrox/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });

const uploadImage = multer({
  storage: createStorage('media'),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

const uploadVideo = multer({
  storage: createStorage('videos', ['mp4', 'mov', 'avi']),
  limits: { fileSize: 200 * 1024 * 1024 },
}).single('video');

const uploadAvatar = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('avatar');

const deleteCloudinaryFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }
};

module.exports = cloudinary;
module.exports.uploadImage = uploadImage;
module.exports.uploadVideo = uploadVideo;
module.exports.uploadAvatar = uploadAvatar;
module.exports.deleteCloudinaryFile = deleteCloudinaryFile;
