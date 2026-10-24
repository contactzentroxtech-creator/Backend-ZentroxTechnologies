import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

/* ══════ IMPORTS (src folder ke andar se) ══════ */
import { Blog } from "./src/models/index.js"; 
import authRoutes from "./src/routes/auth.js";
import cmsRoutes from "./src/routes/cms.js";
import uploadRoutes from "./src/routes/upload.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

/* ══════ HEALTH CHECK ══════ */
app.get("/", (_req, res) => res.json({ success: true, message: "Zentrox API running 🚀" }));
app.get("/api/health", (_req, res) => res.json({ success: true, db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

/* ══════ BLOG ROUTES (Inline) ══════ */
const protectAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

app.get("/api/blog", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 9);
    const { category, search, admin } = req.query;

    const query = admin === "true" ? {} : { published: true };
    
    if (category && category !== "All") query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ featured: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("-content -__v"),
      Blog.countDocuments(query),
    ]);

    res.json({ success: true, data: blogs, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/blog", protectAdmin, async (req, res) => {
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

app.put("/api/blog/:id", protectAdmin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: blog, message: "Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/blog/:id", protectAdmin, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/blog/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true }
    ).select("-__v");
    
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════ OTHER ROUTES ══════ */
app.use("/api/auth", authRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/upload", uploadRoutes);

/* ══════ 404 + ERROR HANDLER ══════ */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});

/* ══════ START SERVER ══════ */
const start = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
};

start();
