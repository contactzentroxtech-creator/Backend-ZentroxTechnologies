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

const popupSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    ctaText: { type: String, default: "" },
    ctaLink: { type: String, default: "" },
    image: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Popup = mongoose.models.Popup || mongoose.model("Popup", popupSchema);

/* GET /api/popups — Public (active popups for website) */
router.get("/", async (req, res) => {
  try {
    const { admin } = req.query;
    const filter = admin === "true" ? {} : { isActive: true };
    const popups = await Popup.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: popups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* POST /api/popups — Admin */
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const popup = await Popup.create(req.body);
    res.status(201).json({ success: true, data: popup });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* PATCH /api/popups/:id — Admin */
router.patch("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const popup = await Popup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!popup) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: popup });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE /api/popups/:id — Admin */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Popup.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Popup deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
