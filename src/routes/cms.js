import express from "express";
import { CMS } from "../models/index.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/settings", async (_req, res) => {
  try {
    let settings = await CMS.findOne();
    if (!settings) settings = await CMS.create({});
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/settings", protect, adminOnly, async (req, res) => {
  try {
    let settings = await CMS.findOne();
    if (!settings) settings = await CMS.create(req.body);
    else settings = await CMS.findByIdAndUpdate(settings._id, req.body, { new: true });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
