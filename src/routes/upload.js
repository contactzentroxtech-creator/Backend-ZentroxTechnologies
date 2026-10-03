const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const jwt = require("jsonwebtoken");

/* ═══════════════════════════════════════════════════════════════
   INLINE AUTH — No middleware dependency
═══════════════════════════════════════════════════════════════ */
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };

/* ═══════════════════════════════════════════════════════════════
   CLOUDINARY CONFIG
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
  limits: { fileSize: 5 * 1024 * 1024 },
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
═══════════════════════════════════════════════════════════════ */
let mediaStore = [];

/* ═══════════════════════════════════════════════════════════════
   POST /api/upload
═══════════════════════════════════════════════════════════════ */
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
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
      res
        .status(500)
        .json({ success: false, message: err.message || "Upload failed" });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
   GET /api/upload
═══════════════════════════════════════════════════════════════ */
router.get("/", protect, authorize("admin"), (req, res) => {
  res.json({ success: true, data: mediaStore });
});

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/upload/:publicId
═══════════════════════════════════════════════════════════════ */
router.delete(
  "/:publicId(*)",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { publicId } = req.params;
      if (!publicId) {
        return res
          .status(400)
          .json({ success: false, message: "publicId is required" });
      }

      await cloudinary.uploader.destroy(publicId);
      mediaStore = mediaStore.filter((m) => m.publicId !== publicId);

      res.json({ success: true, message: "Image deleted successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err.message || "Delete failed" });
    }
  }
);

module.exports = router;
