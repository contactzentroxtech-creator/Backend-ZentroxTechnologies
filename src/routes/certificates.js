const express = require("express");
const router = express.Router();
const { Certificate } = require("../models");

// GET /api/certificates/verify/:certId — public
router.get("/verify/:certId", async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({
      certificateId: req.params.certId,
    }).populate("issuedTo", "name email");
    if (!cert)
      return res
        .status(404)
        .json({ success: false, message: "Certificate not found or invalid." });
    res.json({
      success: true,
      valid: cert.isValid,
      data: {
        certificateId: cert.certificateId,
        type: cert.type,
        recipientName: cert.recipientName,
        courseName: cert.courseName,
        internshipRole: cert.internshipRole,
        issuedBy: cert.issuedBy,
        issuedAt: cert.issuedAt,
        pdfUrl: cert.pdfUrl,
        qrCodeUrl: cert.qrCodeUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates/my — student's certs
const { protect, authorize } = require("../middleware/authMiddleware");
router.get("/my", protect, async (req, res, next) => {
  try {
    const certs = await Certificate.find({ issuedTo: req.user._id }).sort({
      issuedAt: -1,
    });
    res.json({ success: true, data: certs });
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates — admin: all
router.get(
  "/",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const total = await Certificate.countDocuments();
      const certs = await Certificate.find()
        .populate("issuedTo", "name email")
        .sort({ issuedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
      res.json({
        success: true,
        data: certs,
        total,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
