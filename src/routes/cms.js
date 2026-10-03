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
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };

/* ═══════════════════════════════════════════════════════════════
   MONGOOSE MODEL — CMS Data (key-value pairs)
═══════════════════════════════════════════════════════════════ */
const cmsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, default: "" },
  },
  { timestamps: true }
);

const CMS = mongoose.models.CMS || mongoose.model("CMS", cmsSchema);

/* ═══════════════════════════════════════════════════════════════
   DEFAULT VALUES
═══════════════════════════════════════════════════════════════ */
const DEFAULTS = {
  hero_title: "Build. Grow. Scale with Zentrox Technologies",
  hero_subtitle:
    "From websites and mobile apps to AI-powered software and digital marketing — we deliver end-to-end solutions that move your business forward.",
  hero_image: "",
  hero_cta_text: "Start Your Project",
  about_title: "About Zentrox Technologies",
  about_description:
    "We are a team of passionate developers, designers, and marketers helping businesses grow with cutting-edge technology.",
  about_image: "",
  services_title: "Services That Drive Real Growth",
  services_subtitle:
    "From web and mobile to AI and marketing — we deliver end-to-end solutions under one roof.",
  services_image: "",
  contact_phone: "+91 89881 83513",
  contact_email: "contact.zentroxtech@gmail.com",
  contact_address: "Mohali & Chandigarh, Punjab, India",
  social_facebook: "",
  social_instagram: "",
  social_linkedin: "",
  social_twitter: "",
  social_youtube: "",
};

/* ═══════════════════════════════════════════════════════════════
   HELPER — Build full CMS object from DB
═══════════════════════════════════════════════════════════════ */
async function getFullCMS() {
  const docs = await CMS.find({});
  const dbData = {};
  docs.forEach((doc) => {
    dbData[doc.key] = doc.value;
  });
  // DB values override defaults
  return { ...DEFAULTS, ...dbData };
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/cms — Public
═══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const data = await getFullCMS();
    res.json({ success: true, data });
  } catch (err) {
    // Fallback to defaults if DB error
    res.json({ success: true, data: DEFAULTS });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUT /api/cms — Admin only — Save to DB
═══════════════════════════════════════════════════════════════ */
router.put("/", protect, authorize("admin"), async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. Expected key-value object.",
      });
    }

    // Save each key to DB (upsert)
    const ops = Object.entries(updates).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { key, value: String(value || "") },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await CMS.bulkWrite(ops);
    }

    const data = await getFullCMS();

    res.json({
      success: true,
      data,
      message: "CMS settings saved to database",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Update failed",
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/cms/:key — Public
═══════════════════════════════════════════════════════════════ */
router.get("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const doc = await CMS.findOne({ key });
    const value = doc?.value ?? DEFAULTS[key] ?? "";

    res.json({ success: true, data: { key, value } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUT /api/cms/:key — Admin only
═══════════════════════════════════════════════════════════════ */
router.put("/:key", protect, authorize("admin"), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "value is required" });
    }

    await CMS.findOneAndUpdate(
      { key },
      { key, value: String(value) },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: { key, value },
      message: "CMS value updated",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
