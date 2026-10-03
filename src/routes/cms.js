const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");

/* ═══════════════════════════════════════════════════════════════
   IN-MEMORY CMS STORE
   ⚠️ Production mein MongoDB use karo — abhi simple key-value
═══════════════════════════════════════════════════════════════ */
let cmsStore = {
  /* ─── Hero Section ─── */
  hero_title: "Build. Grow. Scale with Zentrox Technologies",
  hero_subtitle:
    "From websites and mobile apps to AI-powered software and digital marketing — we deliver end-to-end solutions that move your business forward.",
  hero_image: "",
  hero_cta_text: "Start Your Project",

  /* ─── About Section ─── */
  about_title: "About Zentrox Technologies",
  about_description:
    "We are a team of passionate developers, designers, and marketers helping businesses grow with cutting-edge technology.",
  about_image: "",

  /* ─── Services Section ─── */
  services_title: "Services That Drive Real Growth",
  services_subtitle:
    "From web and mobile to AI and marketing — we deliver end-to-end solutions under one roof.",
  services_image: "",

  /* ─── Contact ─── */
  contact_phone: "+91 89881 83513",
  contact_email: "contact.zentroxtech@gmail.com",
  contact_address: "Mohali & Chandigarh, Punjab, India",

  /* ─── Social Links ─── */
  social_facebook: "",
  social_instagram: "",
  social_linkedin: "",
  social_twitter: "",
  social_youtube: "",
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/cms
   Fetch all CMS settings — PUBLIC (no auth required)
   Frontend Hero/About/Services fetch karega
═══════════════════════════════════════════════════════════════ */
router.get("/", (req, res) => {
  res.json({
    success: true,
    data: cmsStore,
  });
});

/* ═══════════════════════════════════════════════════════════════
   PUT /api/cms
   Update CMS settings — Admin only
   Body: { key1: "value1", key2: "value2", ... }
═══════════════════════════════════════════════════════════════ */
router.put("/", protect, adminOnly, (req, res) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. Expected key-value object.",
      });
    }

    // Merge updates
    cmsStore = { ...cmsStore, ...updates };

    res.json({
      success: true,
      data: cmsStore,
      message: "CMS settings updated successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Update failed",
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/cms/:key
   Fetch single CMS value — PUBLIC
═══════════════════════════════════════════════════════════════ */
router.get("/:key", (req, res) => {
  const { key } = req.params;

  if (!(key in cmsStore)) {
    return res.status(404).json({
      success: false,
      message: `CMS key "${key}" not found`,
    });
  }

  res.json({
    success: true,
    data: {
      key,
      value: cmsStore[key],
    },
  });
});

/* ═══════════════════════════════════════════════════════════════
   PUT /api/cms/:key
   Update single CMS value — Admin only
═══════════════════════════════════════════════════════════════ */
router.put("/:key", protect, adminOnly, (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({
      success: false,
      message: "value is required",
    });
  }

  cmsStore[key] = value;

  res.json({
    success: true,
    data: { key, value },
    message: "CMS value updated",
  });
});

module.exports = router;
