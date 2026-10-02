const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* ═══════════════════════════════════════════════════════════════
   USER MODEL
═══════════════════════════════════════════════════════════════ */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
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
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "proposal", "won", "lost"],
      default: "new",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: [
      {
        text: String,
        addedBy: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],
    followUpDate: Date,
    city: String,
    businessType: String,
    timeline: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   BLOG MODEL
═══════════════════════════════════════════════════════════════ */
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    excerpt: String,
    content: { type: String, required: true },
    thumbnail: String,
    image: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, default: "Zentrox Technologies" },
    category: { type: String, default: "Blog" },
    tags: [String],
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
    viewCount: { type: Number, default: 0 },
    readTime: { type: Number, default: 5 },
    metaTitle: String,
    metaDesc: String,
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO MODEL (NEW)
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
   REVIEW MODEL (NEW)
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
   CMS / SITE SETTINGS
═══════════════════════════════════════════════════════════════ */
const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ["text", "image", "json", "boolean", "number", "color"],
    },
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
    type: {
      type: String,
      enum: [
        "exit-intent",
        "lead",
        "newsletter",
        "discount",
        "whatsapp",
        "announcement",
      ],
    },
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
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════ */
const User = mongoose.model("User", userSchema);
const Lead = mongoose.model("Lead", leadSchema);
const Blog = mongoose.model("Blog", blogSchema);
const Portfolio = mongoose.model("Portfolio", portfolioSchema);
const Review = mongoose.model("Review", reviewSchema);
const SiteSetting = mongoose.model("SiteSetting", siteSettingsSchema);
const Popup = mongoose.model("Popup", popupSchema);
const Analytics = mongoose.model("Analytics", analyticsSchema);
const Payment = mongoose.model("Payment", paymentSchema);

module.exports = {
  User,
  Lead,
  Blog,
  Portfolio,
  Review,
  SiteSetting,
  Popup,
  Analytics,
  Payment,
};
