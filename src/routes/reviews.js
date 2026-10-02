const express = require("express");
const router = express.Router();
const { Review } = require("../models");
const { protect, adminOnly } = require("../middleware/authMiddleware");

/* ─── GET ALL (PUBLIC) ─────────────────────── */
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─── CREATE (ADMIN) ───────────────────────── */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ─── UPDATE (ADMIN) ───────────────────────── */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    res.json({ success: true, data: review });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ─── DELETE (ADMIN) ───────────────────────── */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
