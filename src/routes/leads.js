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
      return res
        .status(401)
        .json({ success: false, message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    next();
  };

/* ═══════════════════════════════════════════════════════════════
   LEAD MODEL — inline
═══════════════════════════════════════════════════════════════ */
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    service: { type: String, default: "" },
    message: { type: String, default: "" },
    source: { type: String, default: "website" },
    status: {
      type: String,
      default: "new",
      enum: ["new", "contacted", "qualified", "converted", "lost"],
    },
    priority: { type: String, default: "medium" },
    notes: { type: String, default: "" },
    referralCode: { type: String, default: "" },
    baseEstimate: { type: Number, default: 0 },
    finalEstimate: { type: Number, default: 0 },
    projectType: { type: String, default: "" },
    projectDetails: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — Create Lead (Contact form)
═══════════════════════════════════════════════════════════════ */
router.post("/", async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required",
      });
    }
    const lead = await Lead.create(req.body);
    res.status(201).json({
      success: true,
      data: lead,
      message: "Lead saved successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Get all leads
═══════════════════════════════════════════════════════════════ */
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { status, priority, source, search } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (priority && priority !== "all") filter.priority = priority;
    if (source && source !== "all") filter.source = source;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: leads, total: leads.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Get single lead
═══════════════════════════════════════════════════════════════ */
router.get("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Update lead
═══════════════════════════════════════════════════════════════ */
router.patch("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.json({ success: true, data: lead, message: "Lead updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Delete lead
═══════════════════════════════════════════════════════════════ */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Lead deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Stats for Dashboard
═══════════════════════════════════════════════════════════════ */
router.get("/stats/overview", protect, authorize("admin"), async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leadsToday = await Lead.countDocuments({ createdAt: { $gte: today } });
    const newLeads = await Lead.countDocuments({ status: "new" });
    const converted = await Lead.countDocuments({ status: "converted" });

    res.json({
      success: true,
      data: {
        totalLeads,
        leadsToday,
        newLeads,
        converted,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
