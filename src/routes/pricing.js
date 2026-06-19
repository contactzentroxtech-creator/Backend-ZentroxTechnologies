const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/authMiddleware");

// ─── PRICING RULE SCHEMA ──────────────────────────────────────────────────────
const pricingFeatureSchema = new mongoose.Schema({
  id: String,
  label: { en: String, hi: String, pa: String },
  multiplier: { type: Number, default: 1.0 },
  flatAdd: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
});

const pricingServiceSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    label: { en: String, hi: String, pa: String },
    description: { en: String, hi: String, pa: String },
    baseMin: { type: Number, required: true },
    baseMax: { type: Number, required: true },
    icon: { type: String, default: "🌐" },
    category: String,
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    features: [pricingFeatureSchema],
    complexityMultipliers: {
      basic: { type: Number, default: 1.0 },
      standard: { type: Number, default: 1.5 },
      advanced: { type: Number, default: 2.2 },
      enterprise: { type: Number, default: 3.5 },
    },
    timelineDiscounts: {
      rush: { type: Number, default: 1.3 },
      normal: { type: Number, default: 1.0 },
      flexible: { type: Number, default: 0.9 },
    },
    deliveryWeeks: {
      basic: String,
      standard: String,
      advanced: String,
      enterprise: String,
    },
    packages: [
      {
        name: { en: String, hi: String, pa: String },
        minBudget: Number,
        features: [String],
        deliveryWeeks: String,
      },
    ],
  },
  { timestamps: true }
);

const PricingService =
  mongoose.models.PricingService ||
  mongoose.model("PricingService", pricingServiceSchema);

// ─── SEED DEFAULT DATA ────────────────────────────────────────────────────────
const DEFAULT_SERVICES = [
  {
    id: "business-website",
    label: {
      en: "Business Website",
      hi: "बिजनेस वेबसाइट",
      pa: "ਕਾਰੋਬਾਰੀ ਵੈੱਬਸਾਈਟ",
    },
    description: {
      en: "Professional website for your business",
      hi: "आपके व्यवसाय के लिए पेशेवर वेबसाइट",
      pa: "ਤੁਹਾਡੇ ਕਾਰੋਬਾਰ ਲਈ ਪੇਸ਼ੇਵਰ ਵੈੱਬਸਾਈਟ",
    },
    icon: "🌐",
    baseMin: 8000,
    baseMax: 25000,
    complexityMultipliers: {
      basic: 1.0,
      standard: 1.6,
      advanced: 2.5,
      enterprise: 4.0,
    },
    timelineDiscounts: { rush: 1.3, normal: 1.0, flexible: 0.9 },
    deliveryWeeks: {
      basic: "2-3 Weeks",
      standard: "3-4 Weeks",
      advanced: "5-8 Weeks",
      enterprise: "8-12 Weeks",
    },
    features: [
      {
        id: "seo",
        label: {
          en: "SEO Optimization",
          hi: "SEO ऑप्टिमाइज़ेशन",
          pa: "SEO ਅਨੁਕੂਲਨ",
        },
        flatAdd: 5000,
        multiplier: 1.1,
      },
      {
        id: "blog",
        label: { en: "Blog System", hi: "ब्लॉग सिस्टम", pa: "ਬਲੌਗ ਸਿਸਟਮ" },
        flatAdd: 4000,
        multiplier: 1.05,
      },
      {
        id: "multilang",
        label: { en: "Multi-language", hi: "बहु-भाषा", pa: "ਬਹੁ-ਭਾਸ਼ਾ" },
        flatAdd: 8000,
        multiplier: 1.15,
      },
      {
        id: "cms",
        label: {
          en: "CMS Admin Panel",
          hi: "CMS एडमिन पैनल",
          pa: "CMS ਐਡਮਿਨ ਪੈਨਲ",
        },
        flatAdd: 12000,
        multiplier: 1.2,
      },
      {
        id: "maintenance",
        label: {
          en: "1 Year Maintenance",
          hi: "1 साल रखरखाव",
          pa: "1 ਸਾਲ ਰੱਖ-ਰਖਾਅ",
        },
        flatAdd: 10000,
        multiplier: 1.0,
      },
    ],
    packages: [
      {
        name: {
          en: "Starter Package",
          hi: "स्टार्टर पैकेज",
          pa: "ਸਟਾਰਟਰ ਪੈਕੇਜ",
        },
        minBudget: 0,
        features: [
          "5 Pages",
          "Mobile Optimized",
          "2 Revisions",
          "6 Month Support",
        ],
        deliveryWeeks: "2-3 Weeks",
      },
      {
        name: { en: "Growth Package", hi: "ग्रोथ पैकेज", pa: "ਗ੍ਰੋਥ ਪੈਕੇਜ" },
        minBudget: 20000,
        features: ["10 Pages", "CMS", "SEO", "5 Revisions", "1 Year Support"],
        deliveryWeeks: "3-5 Weeks",
      },
      {
        name: {
          en: "Enterprise Package",
          hi: "एंटरप्राइज़ पैकेज",
          pa: "ਐਂਟਰਪ੍ਰਾਈਜ਼ ਪੈਕੇਜ",
        },
        minBudget: 60000,
        features: [
          "Unlimited Pages",
          "Custom Design",
          "AI Features",
          "Unlimited Revisions",
          "2 Year Support",
          "Priority Queue",
        ],
        deliveryWeeks: "6-10 Weeks",
      },
    ],
  },
  {
    id: "ecommerce",
    label: { en: "E-Commerce Store", hi: "ई-कॉमर्स स्टोर", pa: "ਈ-ਕਾਮਰਸ ਸਟੋਰ" },
    description: {
      en: "Full-featured online store",
      hi: "पूर्ण विशेषता वाला ऑनलाइन स्टोर",
      pa: "ਪੂਰਨ ਵਿਸ਼ੇਸ਼ਤਾ ਵਾਲਾ ਔਨਲਾਈਨ ਸਟੋਰ",
    },
    icon: "🛒",
    baseMin: 20000,
    baseMax: 80000,
    complexityMultipliers: {
      basic: 1.0,
      standard: 1.5,
      advanced: 2.2,
      enterprise: 3.5,
    },
    timelineDiscounts: { rush: 1.35, normal: 1.0, flexible: 0.9 },
    deliveryWeeks: {
      basic: "4-5 Weeks",
      standard: "6-8 Weeks",
      advanced: "8-12 Weeks",
      enterprise: "12-20 Weeks",
    },
    features: [
      {
        id: "razorpay",
        label: {
          en: "Razorpay Integration",
          hi: "Razorpay इंटीग्रेशन",
          pa: "Razorpay ਏਕੀਕਰਨ",
        },
        flatAdd: 8000,
        multiplier: 1.1,
      },
      {
        id: "inventory",
        label: {
          en: "Inventory Management",
          hi: "इन्वेंटरी प्रबंधन",
          pa: "ਵਸਤੂ ਪ੍ਰਬੰਧਨ",
        },
        flatAdd: 12000,
        multiplier: 1.15,
      },
      {
        id: "multi-vendor",
        label: { en: "Multi-Vendor", hi: "मल्टी-वेंडर", pa: "ਮਲਟੀ-ਵੈਂਡਰ" },
        flatAdd: 30000,
        multiplier: 1.4,
      },
      {
        id: "mobile-app",
        label: { en: "Mobile App", hi: "मोबाइल ऐप", pa: "ਮੋਬਾਈਲ ਐਪ" },
        flatAdd: 50000,
        multiplier: 1.5,
      },
    ],
    packages: [
      {
        name: { en: "Starter Store", hi: "स्टार्टर स्टोर", pa: "ਸਟਾਰਟਰ ਸਟੋਰ" },
        minBudget: 0,
        features: [
          "50 Products",
          "Payment Gateway",
          "Order Management",
          "3 Revisions",
        ],
        deliveryWeeks: "4-5 Weeks",
      },
      {
        name: { en: "Growth Store", hi: "ग्रोथ स्टोर", pa: "ਗ੍ਰੋਥ ਸਟੋਰ" },
        minBudget: 40000,
        features: [
          "Unlimited Products",
          "Inventory",
          "Analytics",
          "SEO",
          "1 Year Support",
        ],
        deliveryWeeks: "6-9 Weeks",
      },
      {
        name: {
          en: "Enterprise Store",
          hi: "एंटरप्राइज़ स्टोर",
          pa: "ਐਂਟਰਪ੍ਰਾਈਜ਼ ਸਟੋਰ",
        },
        minBudget: 100000,
        features: [
          "Multi-Vendor",
          "Mobile App",
          "AI Recommendations",
          "Custom Reports",
          "Priority Support",
        ],
        deliveryWeeks: "12-20 Weeks",
      },
    ],
  },
  {
    id: "mobile-app",
    label: {
      en: "Mobile App Development",
      hi: "मोबाइल ऐप डेवलपमेंट",
      pa: "ਮੋਬਾਈਲ ਐਪ ਡਿਵੈਲਪਮੈਂਟ",
    },
    description: {
      en: "iOS & Android apps",
      hi: "iOS और Android ऐप्स",
      pa: "iOS ਅਤੇ Android ਐਪਸ",
    },
    icon: "📱",
    baseMin: 50000,
    baseMax: 200000,
    complexityMultipliers: {
      basic: 1.0,
      standard: 1.6,
      advanced: 2.5,
      enterprise: 4.0,
    },
    timelineDiscounts: { rush: 1.4, normal: 1.0, flexible: 0.88 },
    deliveryWeeks: {
      basic: "6-8 Weeks",
      standard: "10-14 Weeks",
      advanced: "16-24 Weeks",
      enterprise: "24-40 Weeks",
    },
    features: [
      {
        id: "ios",
        label: {
          en: "iOS (App Store)",
          hi: "iOS (App Store)",
          pa: "iOS (App Store)",
        },
        flatAdd: 20000,
        multiplier: 1.2,
      },
      {
        id: "android",
        label: {
          en: "Android (Play Store)",
          hi: "Android (Play Store)",
          pa: "Android (Play Store)",
        },
        flatAdd: 15000,
        multiplier: 1.15,
      },
      {
        id: "push-notif",
        label: {
          en: "Push Notifications",
          hi: "पुश नोटिफिकेशन",
          pa: "ਪੁਸ਼ ਨੋਟੀਫਿਕੇਸ਼ਨ",
        },
        flatAdd: 10000,
        multiplier: 1.1,
      },
      {
        id: "payment",
        label: {
          en: "In-App Payments",
          hi: "इन-ऐप पेमेंट",
          pa: "ਇਨ-ਐਪ ਭੁਗਤਾਨ",
        },
        flatAdd: 20000,
        multiplier: 1.2,
      },
      {
        id: "offline",
        label: { en: "Offline Mode", hi: "ऑफलाइन मोड", pa: "ਔਫਲਾਈਨ ਮੋਡ" },
        flatAdd: 25000,
        multiplier: 1.25,
      },
    ],
    packages: [
      {
        name: { en: "Basic App", hi: "बेसिक ऐप", pa: "ਬੇਸਿਕ ਐਪ" },
        minBudget: 0,
        features: [
          "1 Platform",
          "5-8 Screens",
          "Basic Auth",
          "3 Months Support",
        ],
        deliveryWeeks: "6-8 Weeks",
      },
      {
        name: { en: "Standard App", hi: "स्टैंडर्ड ऐप", pa: "ਸਟੈਂਡਰਡ ਐਪ" },
        minBudget: 80000,
        features: [
          "iOS + Android",
          "15-25 Screens",
          "API Integration",
          "Push Notifications",
          "6 Months Support",
        ],
        deliveryWeeks: "12-16 Weeks",
      },
      {
        name: {
          en: "Enterprise App",
          hi: "एंटरप्राइज़ ऐप",
          pa: "ਐਂਟਰਪ੍ਰਾਈਜ਼ ਐਪ",
        },
        minBudget: 200000,
        features: [
          "Full Cross-Platform",
          "AI Features",
          "Offline Mode",
          "Admin Dashboard",
          "1 Year Support",
          "App Store Support",
        ],
        deliveryWeeks: "20-36 Weeks",
      },
    ],
  },
  {
    id: "saas-platform",
    label: { en: "SaaS Platform", hi: "SaaS प्लेटफॉर्म", pa: "SaaS ਪਲੇਟਫਾਰਮ" },
    description: {
      en: "Custom SaaS product",
      hi: "कस्टम SaaS प्रोडक्ट",
      pa: "ਕਸਟਮ SaaS ਉਤਪਾਦ",
    },
    icon: "☁️",
    baseMin: 80000,
    baseMax: 500000,
    complexityMultipliers: {
      basic: 1.0,
      standard: 1.7,
      advanced: 2.8,
      enterprise: 5.0,
    },
    timelineDiscounts: { rush: 1.4, normal: 1.0, flexible: 0.85 },
    deliveryWeeks: {
      basic: "8-12 Weeks",
      standard: "14-20 Weeks",
      advanced: "20-36 Weeks",
      enterprise: "36-60 Weeks",
    },
    features: [
      {
        id: "auth",
        label: { en: "Auth & RBAC", hi: "Auth और RBAC", pa: "Auth ਅਤੇ RBAC" },
        flatAdd: 15000,
        multiplier: 1.1,
      },
      {
        id: "billing",
        label: {
          en: "Subscription Billing",
          hi: "सब्सक्रिप्शन बिलिंग",
          pa: "ਸਬਸਕ੍ਰਿਪਸ਼ਨ ਬਿਲਿੰਗ",
        },
        flatAdd: 30000,
        multiplier: 1.25,
      },
      {
        id: "analytics",
        label: {
          en: "Analytics Dashboard",
          hi: "एनालिटिक्स डैशबोर्ड",
          pa: "ਐਨਾਲਿਟਿਕਸ ਡੈਸ਼ਬੋਰਡ",
        },
        flatAdd: 25000,
        multiplier: 1.2,
      },
      {
        id: "api",
        label: { en: "Public API", hi: "पब्लिक API", pa: "ਪਬਲਿਕ API" },
        flatAdd: 20000,
        multiplier: 1.15,
      },
      {
        id: "ai-features",
        label: { en: "AI Integration", hi: "AI इंटीग्रेशन", pa: "AI ਏਕੀਕਰਨ" },
        flatAdd: 50000,
        multiplier: 1.4,
      },
      {
        id: "whitelabel",
        label: {
          en: "White-label Support",
          hi: "व्हाइट-लेबल सपोर्ट",
          pa: "ਵ੍ਹਾਈਟ-ਲੇਬਲ ਸਪੋਰਟ",
        },
        flatAdd: 40000,
        multiplier: 1.3,
      },
    ],
    packages: [
      {
        name: { en: "MVP SaaS", hi: "MVP SaaS", pa: "MVP SaaS" },
        minBudget: 0,
        features: [
          "Core Features Only",
          "Basic Auth",
          "Simple Dashboard",
          "3 Months Support",
        ],
        deliveryWeeks: "8-12 Weeks",
      },
      {
        name: { en: "Growth SaaS", hi: "ग्रोथ SaaS", pa: "ਗ੍ਰੋਥ SaaS" },
        minBudget: 150000,
        features: [
          "Full Feature Set",
          "RBAC",
          "Billing",
          "Analytics",
          "API",
          "6 Months Support",
        ],
        deliveryWeeks: "16-24 Weeks",
      },
      {
        name: {
          en: "Enterprise SaaS",
          hi: "एंटरप्राइज़ SaaS",
          pa: "ਐਂਟਰਪ੍ਰਾਈਜ਼ SaaS",
        },
        minBudget: 400000,
        features: [
          "All Features",
          "AI Integration",
          "White-label",
          "Custom Integrations",
          "Dedicated PM",
          "1 Year Support",
        ],
        deliveryWeeks: "36-60 Weeks",
      },
    ],
  },
  {
    id: "seo-package",
    label: { en: "SEO Package", hi: "SEO पैकेज", pa: "SEO ਪੈਕੇਜ" },
    description: {
      en: "Search engine optimization",
      hi: "सर्च इंजन ऑप्टिमाइज़ेशन",
      pa: "ਸਰਚ ਇੰਜਨ ਅਨੁਕੂਲਨ",
    },
    icon: "📈",
    baseMin: 5000,
    baseMax: 50000,
    complexityMultipliers: {
      basic: 1.0,
      standard: 2.0,
      advanced: 3.5,
      enterprise: 6.0,
    },
    timelineDiscounts: { rush: 1.0, normal: 1.0, flexible: 0.95 },
    deliveryWeeks: {
      basic: "Ongoing/Monthly",
      standard: "Ongoing/Monthly",
      advanced: "Ongoing/Monthly",
      enterprise: "Ongoing/Monthly",
    },
    features: [
      {
        id: "local-seo",
        label: { en: "Local SEO", hi: "लोकल SEO", pa: "ਲੋਕਲ SEO" },
        flatAdd: 3000,
        multiplier: 1.1,
      },
      {
        id: "content",
        label: {
          en: "Content Creation (4 posts/mo)",
          hi: "कंटेंट क्रिएशन (4 पोस्ट/माह)",
          pa: "ਸਮੱਗਰੀ ਨਿਰਮਾਣ",
        },
        flatAdd: 8000,
        multiplier: 1.15,
      },
      {
        id: "link-building",
        label: { en: "Link Building", hi: "लिंक बिल्डिंग", pa: "ਲਿੰਕ ਬਿਲਡਿੰਗ" },
        flatAdd: 10000,
        multiplier: 1.2,
      },
      {
        id: "google-ads",
        label: {
          en: "Google Ads Management",
          hi: "Google Ads प्रबंधन",
          pa: "Google Ads ਪ੍ਰਬੰਧਨ",
        },
        flatAdd: 8000,
        multiplier: 1.15,
      },
      {
        id: "analytics-setup",
        label: {
          en: "Analytics Setup",
          hi: "एनालिटिक्स सेटअप",
          pa: "ਐਨਾਲਿਟਿਕਸ ਸੈੱਟਅੱਪ",
        },
        flatAdd: 5000,
        multiplier: 1.05,
      },
    ],
    packages: [
      {
        name: { en: "Basic SEO", hi: "बेसिक SEO", pa: "ਬੇਸਿਕ SEO" },
        minBudget: 0,
        features: [
          "10 Keywords",
          "On-page SEO",
          "Monthly Report",
          "Google My Business",
        ],
        deliveryWeeks: "Monthly",
      },
      {
        name: { en: "Growth SEO", hi: "ग्रोथ SEO", pa: "ਗ੍ਰੋਥ SEO" },
        minBudget: 15000,
        features: [
          "30 Keywords",
          "Content Marketing",
          "Link Building",
          "Local SEO",
          "Bi-weekly Report",
        ],
        deliveryWeeks: "Monthly",
      },
      {
        name: {
          en: "Enterprise SEO",
          hi: "एंटरप्राइज़ SEO",
          pa: "ਐਂਟਰਪ੍ਰਾਈਜ਼ SEO",
        },
        minBudget: 40000,
        features: [
          "100+ Keywords",
          "Full Content Strategy",
          "Google Ads",
          "PR Coverage",
          "Weekly Report",
          "Dedicated Manager",
        ],
        deliveryWeeks: "Monthly",
      },
    ],
  },
  {
    id: "ai-integration",
    label: { en: "AI Integration", hi: "AI इंटीग्रेशन", pa: "AI ਏਕੀਕਰਨ" },
    description: {
      en: "AI-powered features for your product",
      hi: "आपके प्रोडक्ट के लिए AI-संचालित फीचर",
      pa: "ਤੁਹਾਡੇ ਉਤਪਾਦ ਲਈ AI ਫੀਚਰ",
    },
    icon: "🤖",
    baseMin: 30000,
    baseMax: 300000,
    complexityMultipliers: {
      basic: 1.0,
      standard: 1.8,
      advanced: 3.0,
      enterprise: 5.5,
    },
    timelineDiscounts: { rush: 1.4, normal: 1.0, flexible: 0.88 },
    deliveryWeeks: {
      basic: "4-6 Weeks",
      standard: "8-14 Weeks",
      advanced: "14-24 Weeks",
      enterprise: "24-48 Weeks",
    },
    features: [
      {
        id: "chatbot",
        label: { en: "AI Chatbot", hi: "AI चैटबॉट", pa: "AI ਚੈਟਬੌਟ" },
        flatAdd: 20000,
        multiplier: 1.2,
      },
      {
        id: "image-gen",
        label: {
          en: "Image Generation",
          hi: "इमेज जेनरेशन",
          pa: "ਚਿੱਤਰ ਜਨਰੇਸ਼ਨ",
        },
        flatAdd: 25000,
        multiplier: 1.25,
      },
      {
        id: "nlp",
        label: {
          en: "NLP & Text Analysis",
          hi: "NLP और टेक्स्ट एनालिसिस",
          pa: "NLP ਅਤੇ ਟੈਕਸਟ ਵਿਸ਼ਲੇਸ਼ਣ",
        },
        flatAdd: 30000,
        multiplier: 1.3,
      },
      {
        id: "recommendation",
        label: {
          en: "Recommendation Engine",
          hi: "रेकमेंडेशन इंजन",
          pa: "ਸਿਫ਼ਾਰਸ਼ ਇੰਜਣ",
        },
        flatAdd: 35000,
        multiplier: 1.35,
      },
      {
        id: "voice",
        label: { en: "Voice AI", hi: "वॉइस AI", pa: "ਵੌਇਸ AI" },
        flatAdd: 40000,
        multiplier: 1.4,
      },
    ],
    packages: [
      {
        name: { en: "AI Starter", hi: "AI स्टार्टर", pa: "AI ਸਟਾਰਟਰ" },
        minBudget: 0,
        features: ["1 AI Feature", "API Integration", "2 Months Support"],
        deliveryWeeks: "4-6 Weeks",
      },
      {
        name: { en: "AI Growth", hi: "AI ग्रोथ", pa: "AI ਗ੍ਰੋਥ" },
        minBudget: 80000,
        features: [
          "3 AI Features",
          "Custom Model",
          "Admin Panel",
          "6 Months Support",
        ],
        deliveryWeeks: "10-16 Weeks",
      },
      {
        name: {
          en: "AI Enterprise",
          hi: "AI एंटरप्राइज़",
          pa: "AI ਐਂਟਰਪ੍ਰਾਈਜ਼",
        },
        minBudget: 200000,
        features: [
          "Full AI Suite",
          "Custom Training",
          "Voice + Vision",
          "Dedicated Engineer",
          "1 Year Support",
        ],
        deliveryWeeks: "20-40 Weeks",
      },
    ],
  },
];

// ─── CALCULATE ENDPOINT ────────────────────────────────────────────────────────
router.post("/calculate", async (req, res, next) => {
  try {
    const {
      serviceId,
      complexity = "standard",
      features = [],
      timeline = "normal",
      budget = 0,
    } = req.body;

    // Get service from DB or seed
    let service = await PricingService.findOne({
      id: serviceId,
      isActive: true,
    });

    if (!service) {
      // Try to seed defaults and retry
      await PricingService.insertMany(DEFAULT_SERVICES, {
        ordered: false,
      }).catch(() => {});
      service = await PricingService.findOne({ id: serviceId, isActive: true });
    }

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    // Calculate base
    const complexMult = service.complexityMultipliers?.[complexity] || 1.0;
    const timeMult = service.timelineDiscounts?.[timeline] || 1.0;

    let minPrice = service.baseMin * complexMult * timeMult;
    let maxPrice = service.baseMax * complexMult * timeMult;

    // Apply features
    for (const featureId of features) {
      const feature = service.features?.find((f) => f.id === featureId);
      if (feature) {
        minPrice = (minPrice + feature.flatAdd) * feature.multiplier;
        maxPrice = (maxPrice + feature.flatAdd) * feature.multiplier;
      }
    }

    // Round to nearest 1000
    minPrice = Math.round(minPrice / 1000) * 1000;
    maxPrice = Math.round(maxPrice / 1000) * 1000;

    // Determine best package
    const packages = service.packages || [];
    let recommendedPackage = packages[0];
    for (const pkg of packages) {
      if (budget >= pkg.minBudget) recommendedPackage = pkg;
    }

    // Delivery
    const delivery = service.deliveryWeeks?.[complexity] || "4-6 Weeks";
    const rushDelivery =
      timeline === "rush"
        ? `${delivery.split("-")[0]}-${
            parseInt(delivery.split("-")[1]) - 1
          } Weeks (Rush)`
        : delivery;

    res.json({
      success: true,
      data: {
        service: { id: service.id, label: service.label, icon: service.icon },
        estimate: { min: minPrice, max: maxPrice, currency: "INR" },
        delivery: rushDelivery,
        recommendedPackage: recommendedPackage || null,
        complexity,
        timeline,
        appliedFeatures: features,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── LIST SERVICES ─────────────────────────────────────────────────────────────
router.get("/services", async (req, res, next) => {
  try {
    let services = await PricingService.find({ isActive: true }).sort({
      order: 1,
    });
    if (!services.length) {
      await PricingService.insertMany(DEFAULT_SERVICES, {
        ordered: false,
      }).catch(() => {});
      services = await PricingService.find({ isActive: true }).sort({
        order: 1,
      });
    }
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN CRUD ───────────────────────────────────────────────────────────────
router.get(
  "/services/admin",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const services = await PricingService.find().sort({ order: 1 });
      res.json({ success: true, data: services });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/services",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const service = await PricingService.create(req.body);
      res
        .status(201)
        .json({ success: true, data: service, message: "Service created." });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/services/:id",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const service = await PricingService.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true }
      );
      res.json({ success: true, data: service, message: "Service updated." });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/services/:id",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      await PricingService.findOneAndDelete({ id: req.params.id });
      res.json({ success: true, message: "Service deleted." });
    } catch (err) {
      next(err);
    }
  }
);

// Seed defaults if needed
router.post("/seed", protect, authorize("admin"), async (req, res, next) => {
  try {
    await PricingService.deleteMany({});
    await PricingService.insertMany(DEFAULT_SERVICES);
    res.json({ success: true, message: "Pricing seeded with defaults." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
