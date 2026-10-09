const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }
  next();
};

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, default: "" },
    company: { type: String, default: "" },
    role: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true },
    image: { type: String, default: "" },
    isApproved: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — Get approved reviews
═══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const { featured, limit } = req.query;
    const filter = { isApproved: true };
    if (featured === "true") filter.featured = true;

    let query = Review.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.limit(Number(limit));

    const reviews = await query;
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — Submit review
═══════════════════════════════════════════════════════════════ */
router.post("/", async (req, res) => {
  try {
    const { name, rating, message } = req.body;
    if (!name || !rating || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, rating, and message are required",
      });
    }
    const review = await Review.create(req.body);
    res.status(201).json({
      success: true,
      data: review,
      message: "Review submitted for approval",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Get all (including pending)
═══════════════════════════════════════════════════════════════ */
router.get("/admin/all", protect, authorize("admin"), async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Approve
═══════════════════════════════════════════════════════════════ */
router.patch("/:id/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!review) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Update
═══════════════════════════════════════════════════════════════ */
router.patch("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!review) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Delete
═══════════════════════════════════════════════════════════════ */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
