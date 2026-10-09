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

const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, default: "" },
    description: { type: String, default: "" },
    category: { type: String, default: "Web" },
    client: { type: String, default: "" },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    technologies: { type: [String], default: [] },
    liveUrl: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Portfolio = mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — Get all published portfolio items
═══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const { category, featured, limit } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (featured === "true") filter.featured = true;

    let query = Portfolio.find(filter).sort({ order: 1, createdAt: -1 });
    if (limit) query = query.limit(Number(limit));

    const items = await query;
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Get all (including non-featured)
═══════════════════════════════════════════════════════════════ */
router.get("/admin/all", protect, authorize("admin"), async (req, res) => {
  try {
    const items = await Portfolio.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Create
═══════════════════════════════════════════════════════════════ */
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const item = await Portfolio.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Update
═══════════════════════════════════════════════════════════════ */
router.patch("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const item = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Delete
═══════════════════════════════════════════════════════════════ */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Portfolio item deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
