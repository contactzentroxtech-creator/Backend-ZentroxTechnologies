const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

let cmsStore = {
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

router.get("/", (req, res) => {
  res.json({ success: true, data: cmsStore });
});

router.put("/", protect, authorize("admin"), (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. Expected key-value object.",
      });
    }
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

router.get("/:key", (req, res) => {
  const { key } = req.params;
  if (!(key in cmsStore)) {
    return res.status(404).json({
      success: false,
      message: `CMS key "${key}" not found`,
    });
  }
  res.json({ success: true, data: { key, value: cmsStore[key] } });
});

router.put("/:key", protect, authorize("admin"), (req, res) => {
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
