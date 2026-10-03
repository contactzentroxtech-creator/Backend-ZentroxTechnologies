const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { protect, adminOnly } = require("../middleware/auth");

/* ═══════════════════════════════════════════════════════════════
   CLOUDINARY CONFIGURATION
   Env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
═══════════════════════════════════════════════════════════════ */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ═══════════════════════════════════════════════════════════════
   MULTER + CLOUDINARY STORAGE
═══════════════════════════════════════════════════════════════ */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "zentrox-media",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

/* ═══════════════════════════════════════════════════════════════
   IN-MEMORY MEDIA STORE
   ⚠️ Production mein database use karo — abhi simple list ke liye
═══════════════════════════════════════════════════════════════ */
let mediaStore = [];

/* ═══════════════════════════════════════════════════════════════
   POST /api/upload
   Upload single image to Cloudinary
═══════════════════════════════════════════════════════════════ */
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const item = {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        format: req.file.format || req.file.mimetype?.split("/")[1] || "jpg",
        width: req.file.width,
        height: req.file.height,
        createdAt: new Date().toISOString(),
      };

      mediaStore.unshift(item);

      res.json({
        success: true,
        data: item,
        message: "Image uploaded successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Upload failed",
      });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
   GET /api/upload
   List all uploaded media
═══════════════════════════════════════════════════════════════ */
router.get("/", protect, adminOnly, (req, res) => {
  res.json({
    success: true,
    data: mediaStore,
  });
});

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/upload/:publicId
   Delete image from Cloudinary
   Note: publicId can have slashes — use wildcard route
═══════════════════════════════════════════════════════════════ */
router.delete("/:publicId(*)", protect, adminOnly, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "publicId is required",
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Remove from in-memory store
    mediaStore = mediaStore.filter((m) => m.publicId !== publicId);

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Delete failed",
    });
  }
});

module.exports = router;
