const express = require("express");
const router = express.Router();

/* ═══════════════════════════════════════════════════════════════
   SERVICE-SPECIFIC PRICING
═══════════════════════════════════════════════════════════════ */
const SERVICE_CONFIGS = {
  web: {
    label: "Website Development",
    basePrice: 7999,
    priceType: "onetime",
    fields: {
      pages: { "1-5": 1.0, "5-10": 1.5, "10-25": 2.2, "25-50": 3.5, "50+": 5.0 },
      type: { static: 1.0, dynamic: 1.4, ecommerce: 2.5, webapp: 4.0 },
      design: { basic: 1.0, custom: 1.4, premium: 2.0 },
    },
    addOns: { payment: 4999, login: 7999, dashboard: 9999, api: 5999, multilang: 5999, seo: 3999 },
  },
  mobile: {
    label: "Mobile App Development",
    basePrice: 79999,
    priceType: "onetime",
    fields: {
      platform: { android: 1.0, ios: 1.15, both: 1.8, cross: 1.3 },
      screens: { "5-10": 1.0, "10-20": 1.5, "20-40": 2.2, "40+": 3.5 },
      features: { basic: 1.0, standard: 1.4, advanced: 2.0, complex: 3.0 },
    },
    addOns: { push: 5999, payment: 9999, chat: 14999, analytics: 4999, admin: 14999, store: 4999 },
  },
  software: {
    label: "Custom Software",
    basePrice: 99999,
    priceType: "onetime",
    fields: {
      type: { crm: 1.0, erp: 1.5, saas: 2.0, custom: 1.3 },
      users: { "1-50": 1.0, "50-500": 1.4, "500-5000": 2.0, "5000+": 3.0 },
      modules: { "3-5": 1.0, "5-10": 1.5, "10-20": 2.2, "20+": 3.0 },
    },
    addOns: { reports: 14999, api: 9999, mobile: 29999, ai: 24999, multiuser: 12999, backup: 7999 },
  },
  design: {
    label: "UI/UX Design",
    basePrice: 9999,
    priceType: "onetime",
    fields: {
      scope: { wireframe: 1.0, ui: 1.5, ux: 2.0, full: 3.0 },
      pages: { "1-5": 1.0, "5-15": 1.8, "15-30": 2.8, "30+": 4.0 },
      revisions: { "2": 1.0, "5": 1.3, unlimited: 1.7 },
    },
    addOns: { prototype: 6999, "design-system": 9999, branding: 12999, icons: 4999, illustrations: 7999, handoff: 2999 },
  },
  seo: {
    label: "SEO Services",
    basePrice: 7999,
    priceType: "monthly",
    fields: {
      keywords: { "10": 1.0, "25": 1.5, "50": 2.2, "100+": 3.5 },
      competition: { low: 1.0, medium: 1.4, high: 2.0, "very-high": 3.0 },
      scope: { onpage: 1.0, technical: 1.5, full: 2.0, enterprise: 3.0 },
    },
    addOns: { content: 7999, backlinks: 9999, local: 4999, gmb: 2999, audit: 4999, reporting: 3999 },
  },
  digital: {
    label: "Digital Marketing",
    basePrice: 9999,
    priceType: "monthly",
    fields: {
      channels: { "1": 1.0, "2": 1.6, "3": 2.2, "4+": 3.0 },
      posts: { "12": 1.0, "20": 1.4, "30": 1.8, "60+": 2.5 },
      platforms: { "1": 1.0, "2-3": 1.5, "4-5": 2.0, "6+": 2.5 },
    },
    addOns: { design: 4999, video: 9999, email: 7999, influencer: 14999, "ads-mgmt": 9999, analytics: 4999 },
  },
  ads: {
    label: "Google Ads Management",
    basePrice: 9999,
    priceType: "monthly",
    fields: {
      adSpend: { "25k": 1.0, "50k": 1.3, "1l": 1.7, "3l": 2.5, "5l+": 3.5 },
      campaigns: { "1": 1.0, "2-3": 1.4, "4-6": 1.8, "6+": 2.5 },
      types: { search: 1.0, "search-display": 1.4, shopping: 1.8, full: 2.5 },
    },
    addOns: { landing: 9999, conversion: 4999, remarketing: 5999, video: 8999, shopping: 7999, reporting: 3999 },
  },
  meta_ads: {
    label: "Meta Ads",
    basePrice: 9999,
    priceType: "monthly",
    fields: {
      adSpend: { "25k": 1.0, "50k": 1.3, "1l": 1.7, "3l": 2.5, "5l+": 3.5 },
      placements: { "fb-feed": 1.0, "fb-ig": 1.3, full: 1.7, all: 2.2 },
      creatives: { static: 1.0, carousel: 1.3, video: 1.7, full: 2.2 },
    },
    addOns: { landing: 9999, video: 14999, pixel: 4999, catalog: 6999, remarketing: 5999, reporting: 3999 },
  },
  ai: {
    label: "AI Integration",
    basePrice: 29999,
    priceType: "onetime",
    fields: {
      type: { chatbot: 1.0, automation: 1.5, analytics: 1.8, custom: 3.0 },
      volume: { "1k": 1.0, "10k": 1.4, "100k": 2.0, "1m+": 3.0 },
      integration: { standalone: 1.0, api: 1.4, existing: 1.8, enterprise: 2.5 },
    },
    addOns: { training: 19999, dashboard: 12999, api: 8999, multilang: 7999, voice: 14999, support: 9999 },
  },
};

const TIMELINE_MULTIPLIERS = { flexible: 0.9, standard: 1.0, fast: 1.3, urgent: 1.6 };

/* ═══════════════════════════════════════════════════════════════
   POST /api/calculator/estimate
═══════════════════════════════════════════════════════════════ */
router.post("/estimate", async (req, res) => {
  try {
    const { serviceId, fieldValues = {}, addOns = [], timeline = "standard", referralDiscount = 0 } = req.body;

    const config = SERVICE_CONFIGS[serviceId];
    if (!config) {
      return res.status(400).json({ success: false, message: `Invalid service: ${serviceId}` });
    }

    let basePrice = config.basePrice;
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      const field = config.fields[fieldId];
      if (field && field[value]) {
        basePrice *= field[value];
      }
    });

    const addOnsTotal = addOns.reduce((sum, id) => sum + (config.addOns[id] || 0), 0);
    const timelineMult = TIMELINE_MULTIPLIERS[timeline] || 1.0;
    const subtotal = (basePrice + addOnsTotal) * timelineMult;

    let discount = 0;
    let final = subtotal;
    if (referralDiscount > 0) {
      discount = subtotal * (referralDiscount / 100);
      final = Math.max(subtotal - discount, (basePrice + addOnsTotal) * 0.85);
    }

    res.json({
      success: true,
      data: {
        serviceId,
        service: config.label,
        priceType: config.priceType,
        estimate: {
          base: Math.round(basePrice),
          addOns: addOnsTotal,
          subtotal: Math.round(subtotal),
          discount: Math.round(discount),
          final: Math.round(final),
          low: Math.round(final * 0.9),
          high: Math.round(final * 1.15),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/calculator/services
═══════════════════════════════════════════════════════════════ */
router.get("/services", (req, res) => {
  const services = Object.entries(SERVICE_CONFIGS).map(([id, cfg]) => ({
    id,
    label: cfg.label,
    basePrice: cfg.basePrice,
    priceType: cfg.priceType,
  }));
  res.json({ success: true, data: services });
});

module.exports = router;
