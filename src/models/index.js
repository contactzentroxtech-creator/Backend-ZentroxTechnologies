import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* ═══════════ USER MODEL ═══════════ */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
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

export const User = mongoose.models.User || mongoose.model("User", userSchema);

/* ═══════════ LEAD MODEL ═══════════ */
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    service: String,
    budget: String,
    message: String,
    status: { type: String, default: "new" },
  },
  { timestamps: true }
);
export const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

/* ═══════════ BLOG MODEL (FIXED) ═══════════ */
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true },
    coverImage: { type: String, default: "" },
    coverImagePublicId: { type: String, default: "" },
    category: { type: String, default: "General" },
    tags: [{ type: String }],
    author: { type: String, default: "Zentrox Team" },
    readTime: { type: Number, default: 5 },
    published: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { timestamps: true }
);

blogSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  next();
});

export const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

/* ═══════════ BAQI MODELS (Agar use ho rahe hain) ═══════════ */
const portfolioSchema = new mongoose.Schema({ title: String, category: String, description: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
export const Portfolio = mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);

const reviewSchema = new mongoose.Schema({ name: String, message: String, rating: Number, isActive: { type: Boolean, default: true } }, { timestamps: true });
export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

const siteSettingsSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed }, { timestamps: true });
export const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", siteSettingsSchema);

const popupSchema = new mongoose.Schema({ name: String, content: String, isActive: { type: Boolean, default: false } }, { timestamps: true });
export const Popup = mongoose.models.Popup || mongoose.model("Popup", popupSchema);

const analyticsSchema = new mongoose.Schema({ date: Date, pageViews: Number, uniqueVisitors: Number }, { timestamps: true });
export const Analytics = mongoose.models.Analytics || mongoose.model("Analytics", analyticsSchema);

const paymentSchema = new mongoose.Schema({ clientName: String, amount: Number, status: String }, { timestamps: true });
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

const referralCodeSchema = new mongoose.Schema({ code: { type: String, unique: true }, ownerName: String, discountPercent: Number }, { timestamps: true });
export const ReferralCode = mongoose.models.ReferralCode || mongoose.model("ReferralCode", referralCodeSchema);
