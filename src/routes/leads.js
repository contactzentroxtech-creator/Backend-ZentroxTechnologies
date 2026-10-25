import express from "express";
import { Lead } from "../models/index.js";

const router = express.Router();

// POST /api/contact
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, service, budget, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "Name and Phone are required" });
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      service,
      budget,
      message,
      source: "website",
      status: "new",
    });

    res.status(201).json({ success: true, data: lead, message: "Message sent successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/contact (Admin - to fetch leads)
router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
