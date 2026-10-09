const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

/* ═══════════════════════════════════════════════════════════════
   INLINE AUTH
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   REFERRAL MODEL — inline
═══════════════════════════════════════════════════════════════ */
const referralSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    ownerName: { type: String, default: "" },
    ownerEmail: { type: String, default: "" },
    discountPercent: { type: Number, default: 10 },
    maxUses: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

const Referral = mongoose.models.Referral || mongoose.model("Referral", referralSchema);

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — Verify a referral code
═══════════════════════════════════════════════════════════════ */
router.post("/verify", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: "Code required" });
    }
    const referral = await Referral.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!referral) {
      return res.json({ valid: false, message: "Invalid referral code" });
    }
    if (referral.usedCount >= referral.maxUses) {
      return res.json({ valid: false, message: "Code usage limit reached" });
    }
    if (referral.expiresAt && referral.expiresAt < new Date()) {
      return res.json({ valid: false, message: "Code expired" });
    }

    res.json({
      valid: true,
      discountPercent: referral.discountPercent,
      code: referral.code,
      message: `${referral.discountPercent}% discount applied`,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Get all referrals
═══════════════════════════════════════════════════════════════ */
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const referrals = await Referral.find().sort({ createdAt: -1 });
    res.json({ success: true, data: referrals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Create referral
═══════════════════════════════════════════════════════════════ */
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { code, discountPercent, maxUses, expiresAt, ownerName, ownerEmail } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "Code required" });
    }

    const existing = await Referral.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Code already exists" });
    }

    const referral = await Referral.create({
      code: code.toUpperCase(),
      discountPercent: discountPercent || 10,
      maxUses: maxUses || 100,
      expiresAt: expiresAt || undefined,
      ownerName: ownerName || "",
      ownerEmail: ownerEmail || "",
    });

    res.status(201).json({ success: true, data: referral });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Update referral
═══════════════════════════════════════════════════════════════ */
router.patch("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!referral) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: referral });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Delete referral
═══════════════════════════════════════════════════════════════ */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Referral.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Referral deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
