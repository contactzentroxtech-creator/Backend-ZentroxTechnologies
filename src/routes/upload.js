// upload.js
const express = require("express");
const  router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  uploadImage,
  uploadAvatar,
} = require("../services/storage/cloudinaryConfig");

router.post(
  "/image",
  protect,
  authorize("admin", "admin"),
  (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err)
        return res.status(400).json({ success: false, message: err.message });
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded." });
      res.json({
        success: true,
        url: req.file.path,
        public_id: req.file.filename,
      });
    });
  }
);

router.post("/avatar", protect, (req, res, next) => {
  uploadAvatar(req, res, async (err) => {
    if (err)
      return res.status(400).json({ success: false, message: err.message });
    if (!req.file)
      return res.status(400).json({ success: false, message: "No file." });
    const { User } = require("../models");
    await User.findByIdAndUpdate(req.user._id, { avatar: req.file.path });
    res.json({ success: true, url: req.file.path });
  });
});

module.exports = router;
