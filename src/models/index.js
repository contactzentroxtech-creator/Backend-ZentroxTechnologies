import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* ═══════════ USER MODEL ═══════════ */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
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

/* ═══════════ BLOG MODEL ═══════════ */
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

/* ═══════════ CMS MODEL ═══════════ */
const cmsSchema = new mongoose.Schema(
  {
    hero_image: { type: String, default: "" },
    hero_title: { type: String, default: "Build Better, Grow Faster" },
    hero_subtitle: { type: String, default: "" },
    site_name: { type: String, default: "Zentrox Technologies" },
    contact_email: { type: String, default: "" },
    contact_phone: { type: String, default: "" },
    social_links: {
      facebook: String,
      instagram: String,
      linkedin: String,
      twitter: String,
    },
  },
  { timestamps: true }
);

export const CMS = mongoose.models.CMS || mongoose.model("CMS", cmsSchema);
