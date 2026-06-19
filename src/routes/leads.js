const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { Lead } = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  sendLeadNotification,
  sendLeadAutoReply,
} = require("../services/email/emailService");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  next();
};

// POST /api/leads — public form submission
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("service").optional().trim(),
    body("message").optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const leadData = {
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        source: req.body.source || "website",
      };
      const lead = await Lead.create(leadData);

      // Send notifications async (don't block response)
      sendLeadNotification(lead).catch(() => {});
      if (lead.email) sendLeadAutoReply(lead).catch(() => {});

      res.status(201).json({
        success: true,
        message: "Thank you! We will contact you within 24 hours.",
        leadId: lead._id,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/leads — admin: get all leads
router.get(
  "/",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { status, priority, page = 1, limit = 20, search } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (search)
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      const total = await Lead.countDocuments(filter);
      const leads = await Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
      res.json({
        success: true,
        data: leads,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/leads/:id
router.get(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead)
        return res
          .status(404)
          .json({ success: false, message: "Lead not found." });
      res.json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/leads/:id — update status, add note
router.patch(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { status, priority, assignedTo, followUpDate, note } = req.body;
      const lead = await Lead.findById(req.params.id);
      if (!lead)
        return res
          .status(404)
          .json({ success: false, message: "Lead not found." });

      if (status) lead.status = status;
      if (priority) lead.priority = priority;
      if (assignedTo) lead.assignedTo = assignedTo;
      if (followUpDate) lead.followUpDate = followUpDate;
      if (note) lead.notes.push({ text: note, addedBy: req.user.name });

      await lead.save();
      res.json({ success: true, data: lead, message: "Lead updated." });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/leads/:id
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Lead deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
