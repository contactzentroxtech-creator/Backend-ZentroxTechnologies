import express from "express";
import Blog from "../models/Blog.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ───────── PUBLIC ───────── */

// GET /api/blog  → published list (pagination + search + category)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 9, category, search } = req.query;
    const query = { published: true };

    if (category && category !== "All") query.category = category;
    if (search) query.title = { $regex: search, $options: "i" };

    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-content"); // list mein full content nahi chahiye

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/blog/featured
router.get("/featured", async (_req, res) => {
  try {
    const blogs = await Blog.find({ published: true, featured: true })
      .sort({ createdAt: -1 })
      .limit(3);
    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/blog/:slug  → single blog + view count
router.get("/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!blog)
      return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ───────── ADMIN ───────── */

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
