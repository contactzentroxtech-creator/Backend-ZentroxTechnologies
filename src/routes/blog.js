import express from "express";
import { Blog } from "../models/index.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", async (req, res) => {
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

router.post("/", protect, adminOnly, async (req, res) => {
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

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: blog, message: "Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

router.get("/:slug", async (req, res) => {
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

export default router;
