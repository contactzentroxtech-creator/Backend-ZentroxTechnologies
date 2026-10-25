import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

/* ═══════════════════════════════════════════════════════════════
   IMPORTS (Models)
═══════════════════════════════════════════════════════════════ */
import { User, Blog, Lead } from "./src/models/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ═══════════════════════════════════════════════════════════════
   CORS & MIDDLEWARE
═══════════════════════════════════════════════════════════════ */
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://zentroxtechnologies.com",
  "https://www.zentroxtechnologies.com",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ═══════════════════════════════════════════════════════════════
   AUTH MIDDLEWARE
═══════════════════════════════════════════════════════════════ */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

/* ═══════════════════════════════════════════════════════════════
   HEALTH CHECK
═══════════════════════════════════════════════════════════════ */
app.get("/", (_req, res) => {
  res.json({ success: true, message: "Zentrox API running 🚀" });
});

app.get("/api/health", (_req, res) => {
  const state = mongoose.connection.readyState;
  res.status(state === 1 ? 200 : 503).json({
    success: state === 1,
    db: state === 1 ? "connected" : "disconnected",
  });
});

/* ═══════════════════════════════════════════════════════════════
   AUTH ROUTES
═══════════════════════════════════════════════════════════════ */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/auth/me", protect, async (req, res) => {
  res.json({ success: true, user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

app.post("/api/auth/seed-admin", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@zentrox.com" });
    if (existing) return res.json({ success: true, message: "Admin exists" });
    await User.create({ name: "Admin", email: "admin@zentrox.com", password: "admin123", role: "admin" });
    res.json({ success: true, message: "Admin created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   BLOG ROUTES
═══════════════════════════════════════════════════════════════ */
app.get("/api/blog", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 9);
    const { category, search, admin } = req.query;
    const query = admin === "true" ? {} : { published: true };
    if (category && category !== "All") query.category = category;
    if (search) query.$or = [{ title: { $regex: search, $options: "i" } }, { excerpt: { $regex: search, $options: "i" } }];
    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ featured: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("-content -__v"),
      Blog.countDocuments(query),
    ]);
    res.json({ success: true, data: blogs, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/blog", protect, adminOnly, async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, category, tags, author, published, featured } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: "Title and content required" });
    let finalSlug = title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    const exists = await Blog.findOne({ slug: finalSlug });
    if (exists) finalSlug = `${finalSlug}-${Date.now().toString().slice(-5)}`;
    const blog = await Blog.create({
      title, slug: finalSlug, content, excerpt: excerpt || "", coverImage: coverImage || "",
      category: category || "General", tags: tags || [], author: author || "Zentrox Team",
      published: published !== undefined ? !!published : true, featured: !!featured,
    });
    res.status(201).json({ success: true, data: blog, message: "Blog created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/blog/:id", protect, adminOnly, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: blog, message: "Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/blog/:id", protect, adminOnly, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/blog/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate({ slug: req.params.slug, published: true }, { $inc: { views: 1 } }, { new: true }).select("-__v");
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   CONTACT / LEADS ROUTES (No Auth Required for Testing)
═══════════════════════════════════════════════════════════════ */
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, service, budget, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "Name and Phone are required" });
    }
    const lead = await Lead.create({
      name, email, phone, service, budget, message, source: "website", status: "new",
    });
    res.status(201).json({ success: true, data: lead, message: "Message sent successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/contact", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   UPLOAD ROUTE (Cloudinary)
═══════════════════════════════════════════════════════════════ */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: "zentrox-media", allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "svg"] },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post("/api/upload", protect, adminOnly, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    res.json({ success: true, data: { url: req.file.path, publicId: req.file.filename } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   404 & START SERVER
═══════════════════════════════════════════════════════════════ */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

const start = async () => {
  try {
    const dbUrl = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!dbUrl) throw new Error("MONGO_URI missing in .env");
    await mongoose.connect(dbUrl);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
};

start();
