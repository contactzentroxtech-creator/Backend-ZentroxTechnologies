import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Blog } from "../models/index.js";

const router = express.Router();

/* ═══════════════════════════════════════════════════════════════
   INLINE AUTH
═══════════════════════════════════════════════════════════════ */
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

/* ═══════════════════════════════════════════════════════════════
   PUBLIC / ADMIN LIST ROUTE (FIXED FOR ADMIN PANEL)
═══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 9);
    const { category, search, tag, admin } = req.query;

    // ⭐ Agar admin=true hai toh saare blogs dikhao, warna sirf published
    const query = admin === "true" ? {} : { published: true };

    if (category && category !== "All") query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .sort({ featured: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-content -__v"),
      Blog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC: GET /api/blog/featured
═══════════════════════════════════════════════════════════════ */
router.get("/featured", async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true, featured: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("-content");
    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC: GET /api/blog/categories
═══════════════════════════════════════════════════════════════ */
router.get("/categories", async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { published: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({
      success: true,
      data: categories.map((c) => ({ name: c._id, count: c.count })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN: GET /api/blog/admin/all
   (Yeh route safe hai, lekin frontend ab ?admin=true use kar raha hai)
═══════════════════════════════════════════════════════════════ */
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const [blogs, total] = await Promise.all([
      Blog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-content -__v"),
      Blog.countDocuments(),
    ]);

    res.json({
      success: true,
      data: blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN: GET /api/blog/admin/:id
═══════════════════════════════════════════════════════════════ */
router.get("/admin/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC: GET /api/blog/:slug (LAST — catch-all)
═══════════════════════════════════════════════════════════════ */
router.get("/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true }
    ).select("-__v");

    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    const related = await Blog.find({
      published: true,
      category: blog.category,
      _id: { $ne: blog._id },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("-content");

    res.json({ success: true, data: blog, related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN: POST /api/blog (CREATE NEW BLOG)
═══════════════════════════════════════════════════════════════ */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      title, content, excerpt, coverImage, coverImagePublicId,
      category, tags, author, readTime, published, featured,
      metaTitle, metaDescription, slug,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content required" });
    }

    // Auto slug agar missing
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    // Slug duplicate check
    const exists = await Blog.findOne({ slug: finalSlug });
    if (exists) finalSlug = `${finalSlug}-${Date.now().toString().slice(-5)}`;

    const blog = await Blog.create({
      title,
      slug: finalSlug,
      content,
      excerpt: excerpt || "",
      coverImage: coverImage || "",
      coverImagePublicId: coverImagePublicId || "",
      category: category || "General",
      tags: Array.isArray(tags) ? tags : [],
      author: author || "Zentrox Team",
      readTime: readTime || 5,
      published: published !== undefined ? !!published : true,
      featured: !!featured,
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
    });

    res.status(201).json({ success: true, data: blog, message: "Blog created successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN: PUT /api/blog/:id (UPDATE BLOG)
═══════════════════════════════════════════════════════════════ */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, data: blog, message: "Blog updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN: DELETE /api/blog/:id
═══════════════════════════════════════════════════════════════ */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, message: "Blog deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
