import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* ═══════════════════════════════════════════════════════════════
   USER MODEL
═══════════════════════════════════════════════════════════════ */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerifyToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

/* ═══════════════════════════════════════════════════════════════
   LEAD MODEL
═══════════════════════════════════════════════════════════════ */
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    service: String,
    budget: String,
    message: String,
    source: { type: String, default: "website" },
    status: { type: String, enum: ["new", "contacted", "qualified", "proposal", "won", "lost"], default: "new" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: [{ text: String, addedBy: String, addedAt: { type: Date, default: Date.now } }],
    followUpDate: Date,
    city: String,
    businessType: String,
    timeline: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    ipAddress: String,
    userAgent: String,
    referralCode: { type: String, default: "" },
    referralOwner: { type: String, default: "" },
    discountPercent: { type: Number, default: 0 },
    baseEstimate: { type: Number, default: 0 },
    finalEstimate: { type: Number, default: 0 },
    projectType: { type: String, default: "" },
    projectDetails: { type: Object, default: {} },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   BLOG MODEL (⭐ FIXED — Frontend ke hisaab se)
═══════════════════════════════════════════════════════════════ */
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true },
    
    // Frontend image ke liye `coverImage` use karta hai
    coverImage: { type: String, default: "" },
    coverImagePublicId: { type: String, default: "" },
    
    category: { type: String, default: "General" },
    tags: [{ type: String }],
    author: { type: String, default: "Zentrox Team" },
    readTime: { type: Number, default: 5 },
    
    // Frontend publish status ke liye `published` use karta hai
    published: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    
    // Frontend views count ke liye `views` use karta hai
    views: { type: Number, default: 0 },
    
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { timestamps: true }
);

blogSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO MODEL
═══════════════════════════════════════════════════════════════ */
const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    desc: { type: String },
    url: { type: String, default: "" },
    icon: { type: String, default: "Globe" },
    color: { type: String, default: "#7c3aed" },
    results: [{ type: String }],
    tags: [{ type: String }],
    isLive: { type: Boolean, default: false },
    real: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   REVIEW MODEL
═══════════════════════════════════════════════════════════════ */
const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "" },
    company: { type: String, default: "" },
    message: { type: String, required: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    color: { type: String, default: "#7c3aed" },
    date: { type: String, default: "" },
    source: { type: String, default: "Google" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   SITE SETTINGS / CMS
═══════════════════════════════════════════════════════════════ */
const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    type: { type: String, enum: ["text", "image", "json", "boolean", "number", "color"] },
    label: String,
    group: String,
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   POPUP MODEL
═══════════════════════════════════════════════════════════════ */
const popupSchema = new mongoose.Schema(
  {
    name: String,
    type: { type: String, enum: ["exit-intent", "lead", "newsletter", "discount", "whatsapp", "announcement"] },
    title: String,
    content: String,
    ctaText: String,
    ctaLink: String,
    image: String,
    isActive: { type: Boolean, default: false },
    trigger: { type: String, enum: ["time", "scroll", "exit", "click"] },
    triggerValue: Number,
    showOnce: { type: Boolean, default: true },
    targetPages: [String],
    scheduledFrom: Date,
    scheduledTo: Date,
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS MODEL
═══════════════════════════════════════════════════════════════ */
const analyticsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    pageViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    leadsGenerated: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    topPages: [{ page: String, views: Number }],
    sources: [{ source: String, count: Number }],
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   PAYMENT MODEL
═══════════════════════════════════════════════════════════════ */
const paymentSchema = new mongoose.Schema(
  {
    clientName: String,
    clientEmail: String,
    projectName: String,
    gateway: { type: String, enum: ["razorpay", "stripe"] },
    orderId: String,
    paymentId: String,
    amount: Number,
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed", "refunded"], default: "created" },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   REFERRAL CODE MODEL
═══════════════════════════════════════════════════════════════ */
const referralCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, trim: true },
    ownerEmail: { type: String, trim: true, lowercase: true },
    ownerRole: { type: String, enum: ["sales", "partner", "affiliate", "employee", "other"], default: "sales" },
    discountPercent: { type: Number, default: 20, min: 0, max: 50 },
    maxUses: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ name: String, email: String, phone: String, projectType: String, baseEstimate: Number, finalEstimate: Number, usedAt: { type: Date, default: Date.now } }],
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

referralCodeSchema.methods.isValid = function () {
  if (!this.isActive) return { valid: false, reason: "Code is inactive" };
  if (this.usedCount >= this.maxUses) return { valid: false, reason: "Code usage limit reached" };
  if (this.expiresAt && new Date() > this.expiresAt) return { valid: false, reason: "Code has expired" };
  return { valid: true };
};

/* ═══════════════════════════════════════════════════════════════
   EXPORTS (Named exports taaki routes mein import ho sake)
═══════════════════════════════════════════════════════════════ */
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
export const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);
export const Portfolio = mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);
export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", siteSettingsSchema);
export const Popup = mongoose.models.Popup || mongoose.model("Popup", popupSchema);
export const Analytics = mongoose.models.Analytics || mongoose.model("Analytics", analyticsSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export const ReferralCode = mongoose.models.ReferralCode || mongoose.model("ReferralCode", referralCodeSchema);
