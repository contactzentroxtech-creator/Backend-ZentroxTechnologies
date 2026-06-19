const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/authMiddleware");

// ─── TRANSLATION SCHEMA ───────────────────────────────────────────────────────
const translationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    group: { type: String, default: "general" },
    en: { type: String, default: "" },
    hi: { type: String, default: "" },
    pa: { type: String, default: "" },
    isEditable: { type: Boolean, default: true },
    description: String,
  },
  { timestamps: true }
);

translationSchema.index({ key: 1 }, { unique: true });
const Translation =
  mongoose.models.Translation ||
  mongoose.model("Translation", translationSchema);

// ─── DEFAULT TRANSLATIONS (subset — admin can extend) ─────────────────────────
const DEFAULTS = [
  // Hero
  {
    key: "hero.badge",
    group: "Hero",
    en: "Mohali & Chandigarh — MSME Registered Technology Company",
    hi: "मोहाली और चंडीगढ़ — MSME पंजीकृत",
    pa: "ਮੋਹਾਲੀ ਅਤੇ ਚੰਡੀਗੜ੍ਹ — MSME ਰਜਿਸਟਰਡ",
  },
  {
    key: "hero.line1",
    group: "Hero",
    en: "We Build",
    hi: "हम बनाते हैं",
    pa: "ਅਸੀਂ ਬਣਾਉਂਦੇ ਹਾਂ",
  },
  {
    key: "hero.sub",
    group: "Hero",
    en: "Premium web solutions, futuristic SaaS products, and intelligent digital systems — crafted for Punjab's boldest businesses.",
    hi: "प्रीमियम वेब सॉल्यूशन, फ्यूचरिस्टिक SaaS प्रोडक्ट और इंटेलिजेंट डिजिटल सिस्टम — पंजाब के सबसे महत्वाकांक्षी व्यवसायों के लिए।",
    pa: "ਪ੍ਰੀਮੀਅਮ ਵੈੱਬ ਹੱਲ, ਫਿਊਚਰਿਸਟਿਕ SaaS ਅਤੇ ਬੁੱਧੀਮਾਨ ਡਿਜੀਟਲ ਸਿਸਟਮ — ਪੰਜਾਬ ਦੇ ਸਭ ਤੋਂ ਦਲੇਰ ਕਾਰੋਬਾਰਾਂ ਲਈ।",
  },
  {
    key: "hero.cta_primary",
    group: "Hero",
    en: "Start Your Project",
    hi: "अपना प्रोजेक्ट शुरू करें",
    pa: "ਆਪਣਾ ਪ੍ਰੋਜੈਕਟ ਸ਼ੁਰੂ ਕਰੋ",
  },
  {
    key: "hero.cta_secondary",
    group: "Hero",
    en: "Saturday Live Classes",
    hi: "शनिवार की लाइव क्लास",
    pa: "ਸ਼ਨੀਵਾਰ ਦੀਆਂ ਲਾਈਵ ਕਲਾਸਾਂ",
  },
  // Services
  {
    key: "services.badge",
    group: "Services",
    en: "What We Build",
    hi: "हम क्या बनाते हैं",
    pa: "ਅਸੀਂ ਕੀ ਬਣਾਉਂਦੇ ਹਾਂ",
  },
  {
    key: "services.title",
    group: "Services",
    en: "Premium Digital Services for Growing Businesses",
    hi: "बढ़ते व्यवसायों के लिए प्रीमियम डिजिटल सेवाएं",
    pa: "ਵਧਦੇ ਕਾਰੋਬਾਰਾਂ ਲਈ ਪ੍ਰੀਮੀਅਮ ਡਿਜੀਟਲ ਸੇਵਾਵਾਂ",
  },
  // CTA
  {
    key: "cta.primary",
    group: "CTA",
    en: "Book Free Consultation",
    hi: "मुफ्त परामर्श बुक करें",
    pa: "ਮੁਫ਼ਤ ਸਲਾਹ ਬੁੱਕ ਕਰੋ",
  },
  {
    key: "cta.title",
    group: "CTA",
    en: "Transform Your Business",
    hi: "अपने व्यवसाय को बदलें",
    pa: "ਆਪਣੇ ਕਾਰੋਬਾਰ ਨੂੰ ਬਦਲੋ",
  },
  // Classes
  {
    key: "classes.title",
    group: "Classes",
    en: "Live Saturday Classes — Every Week",
    hi: "शनिवार की लाइव क्लास — हर हफ्ते",
    pa: "ਸ਼ਨੀਵਾਰ ਦੀਆਂ ਲਾਈਵ ਕਲਾਸਾਂ — ਹਰ ਹਫ਼ਤੇ",
  },
  {
    key: "classes.enroll",
    group: "Classes",
    en: "Enroll Free — Saturday Classes",
    hi: "मुफ्त में एनरोल करें",
    pa: "ਮੁਫ਼ਤ ਵਿੱਚ ਦਾਖਲਾ ਲਓ",
  },
  // Footer
  {
    key: "footer.copy",
    group: "Footer",
    en: "All rights reserved. MSME Registered — India.",
    hi: "सर्वाधिकार सुरक्षित। MSME पंजीकृत — भारत।",
    pa: "ਸਾਰੇ ਅਧਿਕਾਰ ਸੁਰੱਖਿਅਤ। MSME ਰਜਿਸਟਰਡ — ਭਾਰਤ।",
  },
  // Contact
  {
    key: "contact.send",
    group: "Contact",
    en: "Send Message — Get Free Quote",
    hi: "संदेश भेजें — मुफ्त कोटेशन पाएं",
    pa: "ਸੁਨੇਹਾ ਭੇਜੋ — ਮੁਫ਼ਤ ਕੋਟੇਸ਼ਨ ਪ੍ਰਾਪਤ ਕਰੋ",
  },
  {
    key: "contact.success",
    group: "Contact",
    en: "Message sent! We'll contact you within 24 hours.",
    hi: "संदेश भेज दिया गया! 24 घंटे में संपर्क करेंगे।",
    pa: "ਸੁਨੇਹਾ ਭੇਜਿਆ ਗਿਆ! 24 ਘੰਟਿਆਂ ਵਿੱਚ ਸੰਪਰਕ ਕਰਾਂਗੇ।",
  },
  // Navbar
  {
    key: "nav.services",
    group: "Navbar",
    en: "Services",
    hi: "सेवाएं",
    pa: "ਸੇਵਾਵਾਂ",
  },
  {
    key: "nav.courses",
    group: "Navbar",
    en: "Courses",
    hi: "कोर्स",
    pa: "ਕੋਰਸ",
  },
  {
    key: "nav.internship",
    group: "Navbar",
    en: "Internship",
    hi: "इंटर्नशिप",
    pa: "ਇੰਟਰਨਸ਼ਿਪ",
  },
  { key: "nav.blog", group: "Navbar", en: "Blog", hi: "ब्लॉग", pa: "ਬਲੌਗ" },
  {
    key: "nav.about",
    group: "Navbar",
    en: "About",
    hi: "हमारे बारे में",
    pa: "ਸਾਡੇ ਬਾਰੇ",
  },
  {
    key: "nav.contact",
    group: "Navbar",
    en: "Contact",
    hi: "संपर्क",
    pa: "ਸੰਪਰਕ",
  },
  {
    key: "nav.get_started",
    group: "Navbar",
    en: "Get Started",
    hi: "शुरू करें",
    pa: "ਸ਼ੁਰੂ ਕਰੋ",
  },
];

// ─── GET ALL TRANSLATIONS (public) ────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { lang } = req.query;
    let translations = await Translation.find().select("key en hi pa group");

    if (!translations.length) {
      await Translation.insertMany(DEFAULTS, { ordered: false }).catch(
        () => {}
      );
      translations = await Translation.find().select("key en hi pa group");
    }

    if (lang && ["en", "hi", "pa"].includes(lang)) {
      // Return flat key->value map for specific language
      const map = {};
      translations.forEach((t) => {
        map[t.key] = t[lang] || t.en || t.key;
      });
      return res.json({ success: true, data: map, lang });
    }

    // Return full structure for admin
    res.json({ success: true, data: translations });
  } catch (err) {
    next(err);
  }
});

// ─── GET BY GROUP (public) ────────────────────────────────────────────────────
router.get("/group/:group", async (req, res, next) => {
  try {
    const translations = await Translation.find({ group: req.params.group });
    res.json({ success: true, data: translations });
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE TRANSLATION (admin) ───────────────────────────────────────────────
router.patch(
  "/:id",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const { en, hi, pa } = req.body;
      const updated = await Translation.findByIdAndUpdate(
        req.params.id,
        { en, hi, pa },
        { new: true }
      );
      res.json({
        success: true,
        data: updated,
        message: "Translation updated.",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── BULK UPDATE (admin) ──────────────────────────────────────────────────────
router.patch(
  "/",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const { translations } = req.body;
      const ops = translations.map((t) =>
        Translation.findOneAndUpdate(
          { key: t.key },
          { en: t.en, hi: t.hi, pa: t.pa },
          { upsert: true, new: true }
        )
      );
      await Promise.all(ops);
      res.json({
        success: true,
        message: `${translations.length} translations saved.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── CREATE NEW KEY (admin) ───────────────────────────────────────────────────
router.post(
  "/",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const translation = await Translation.create(req.body);
      res.status(201).json({ success: true, data: translation });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE (admin) ──────────────────────────────────────────────────────
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await Translation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Translation deleted." });
  } catch (err) {
    next(err);
  }
});

// ─── SEED/RESET DEFAULTS (admin) ────────────────────────────────────────
router.post("/seed", protect, authorize("admin"), async (req, res, next) => {
  try {
    const ops = DEFAULTS.map((d) =>
      Translation.findOneAndUpdate({ key: d.key }, d, {
        upsert: true,
        new: true,
      })
    );
    await Promise.all(ops);
    res.json({
      success: true,
      message: `${DEFAULTS.length} default translations seeded.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
