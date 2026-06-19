const express = require("express");
const router = express.Router();
const { SiteSetting, Popup } = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");

// GET /api/cms/settings — public (for frontend to read active settings)
router.get("/settings", async (req, res, next) => {
  try {
    const settings = await SiteSetting.find();
    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    res.json({ success: true, data: map });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cms/settings — admin bulk update
router.patch(
  "/settings",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const { settings } = req.body; // array of { key, value, type, label, group }
      const ops = settings.map((s) =>
        SiteSetting.findOneAndUpdate({ key: s.key }, s, {
          upsert: true,
          new: true,
        })
      );
      await Promise.all(ops);
      res.json({ success: true, message: "Settings saved." });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/cms/popups/active — public, get active popups
router.get("/popups/active", async (req, res, next) => {
  try {
    const now = new Date();
    const popups = await Popup.find({
      isActive: true,
      $or: [
        { scheduledFrom: null, scheduledTo: null },
        { scheduledFrom: { $lte: now }, scheduledTo: { $gte: now } },
      ],
    });
    res.json({ success: true, data: popups });
  } catch (err) {
    next(err);
  }
});

// GET /api/cms/popups — admin: all
router.get(
  "/popups",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const popups = await Popup.find().sort({ createdAt: -1 });
      res.json({ success: true, data: popups });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/cms/popups
router.post(
  "/popups",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const popup = await Popup.create(req.body);
      res
        .status(201)
        .json({ success: true, data: popup, message: "Popup created." });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/cms/popups/:id
router.patch(
  "/popups/:id",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const popup = await Popup.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.json({ success: true, data: popup, message: "Popup updated." });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/cms/popups/:id
router.delete(
  "/popups/:id",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      await Popup.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: "Popup deleted." });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
