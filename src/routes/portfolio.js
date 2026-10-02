const express = require("express");
const router = express.Router();
const { Portfolio } = require("../models");
const { protect, adminOnly } = require("../middleware/authMiddleware");

/* ─── GET ALL (PUBLIC) ─────────────────────── */
router.get("/", async (req, res) => {
  try {
    const projects = await Portfolio.find({ isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─── GET ONE (PUBLIC) ─────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const project = await Portfolio.findById(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─── CREATE (ADMIN) ───────────────────────── */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const project = await Portfolio.create(req.body);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ─── UPDATE (ADMIN) ───────────────────────── */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const project = await Portfolio.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ─── DELETE (ADMIN) ───────────────────────── */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const project = await Portfolio.findByIdAndDelete(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
