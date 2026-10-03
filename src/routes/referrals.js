const express = require("express");
const router = express.Router();
const { ReferralCode } = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — VERIFY REFERRAL CODE
═══════════════════════════════════════════════════════════════ */
router.post("/verify", async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Please enter a referral code",
      });
    }

    const referral = await ReferralCode.findOne({
      code: code.trim().toUpperCase(),
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "Invalid referral code",
      });
    }

    const check = referral.isValid();
    if (!check.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: check.reason,
      });
    }

    res.json({
      success: true,
      valid: true,
      discountPercent: referral.discountPercent,
      ownerName: referral.ownerName,
      message: `${referral.discountPercent}% discount applied! Referred by ${referral.ownerName}`,
    });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — GET ALL
═══════════════════════════════════════════════════════════════ */
router.get("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (status === "used") {
      filter.$expr = { $gte: ["$usedCount", "$maxUses"] };
    }
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { ownerPhone: { $regex: search, $options: "i" } },
      ];
    }

    const total = await ReferralCode.countDocuments(filter);
    const codes = await ReferralCode.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: codes,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — GET ONE
═══════════════════════════════════════════════════════════════ */
router.get("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const referral = await ReferralCode.findById(req.params.id);
    if (!referral) {
      return res
        .status(404)
        .json({ success: false, message: "Referral code not found" });
    }
    res.json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — CREATE
═══════════════════════════════════════════════════════════════ */
router.post("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const {
      code,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownerRole,
      discountPercent,
      maxUses,
      expiresAt,
      notes,
    } = req.body;

    if (!code || !ownerName) {
      return res.status(400).json({
        success: false,
        message: "Code and Owner Name are required",
      });
    }

    const existing = await ReferralCode.findOne({
      code: code.trim().toUpperCase(),
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This code already exists. Please use a different code.",
      });
    }

    const referral = await ReferralCode.create({
      code: code.trim().toUpperCase(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone || "",
      ownerEmail: ownerEmail || "",
      ownerRole: ownerRole || "sales",
      discountPercent: discountPercent || 20,
      maxUses: maxUses || 1,
      expiresAt: expiresAt || null,
      notes: notes || "",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: referral,
      message: "Referral code created successfully",
    });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — UPDATE
═══════════════════════════════════════════════════════════════ */
router.put("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const referral = await ReferralCode.findById(req.params.id);
    if (!referral) {
      return res
        .status(404)
        .json({ success: false, message: "Referral code not found" });
    }

    const {
      ownerName,
      ownerPhone,
      ownerEmail,
      ownerRole,
      discountPercent,
      maxUses,
      isActive,
      expiresAt,
      notes,
    } = req.body;

    if (ownerName) referral.ownerName = ownerName;
    if (ownerPhone !== undefined) referral.ownerPhone = ownerPhone;
    if (ownerEmail !== undefined) referral.ownerEmail = ownerEmail;
    if (ownerRole) referral.ownerRole = ownerRole;
    if (discountPercent !== undefined)
      referral.discountPercent = discountPercent;
    if (maxUses !== undefined) referral.maxUses = maxUses;
    if (isActive !== undefined) referral.isActive = isActive;
    if (expiresAt !== undefined) referral.expiresAt = expiresAt;
    if (notes !== undefined) referral.notes = notes;

    await referral.save();

    res.json({
      success: true,
      data: referral,
      message: "Referral code updated",
    });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — DELETE
═══════════════════════════════════════════════════════════════ */
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const referral = await ReferralCode.findByIdAndDelete(req.params.id);
    if (!referral) {
      return res
        .status(404)
        .json({ success: false, message: "Referral code not found" });
    }
    res.json({ success: true, message: "Referral code deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
