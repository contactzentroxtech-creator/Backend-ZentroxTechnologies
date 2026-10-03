const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

/* ═══════════════════════════════════════════════════════════════
   INLINE AUTH — no middleware dependency
═══════════════════════════════════════════════════════════════ */
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };

/* ═══════════════════════════════════════════════════════════════
   BLOG MODEL — inline schema (no dependency on models/index.js)
═══════════════════════════════════════════════════════════════ */
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    image: { type: String, default: "" },
    category: { type: String, default: "General" },
    tags: { type: [String], default: [] },
    authorName: { type: String, default: "Admin" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readTime: { type: Number, default: 1 },
    isPublished: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date },
    viewCount: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        userName: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Blog =
  mongoose.models.Blog || mongoose.model("Blog", blogSchema);

/* ─── Slugify helper (no dependency) ─── */
const slugifyText = (text) => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN ROUTES
═══════════════════════════════════════════════════════════════ */

/* Admin: Get all posts (including drafts) */
router.get("/admin/all", protect, authorize("admin"), async (req, res) => {
  try {
    const posts = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Admin: Create post */
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const slug = slugifyText(req.body.title);
    const readTime = Math.ceil(
      (req.body.content || "").split(" ").length / 200
    );
    const post = await Blog.create({
      ...req.body,
      slug,
      readTime,
      authorName: req.body.authorName || req.user.email || "Admin",
      author: req.user.id,
      publishedAt: req.body.isPublished ? new Date() : undefined,
    });
    res
      .status(201)
      .json({ success: true, data: post, message: "Blog post created." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Admin: Update post */
router.patch("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    if (req.body.title) req.body.slug = slugifyText(req.body.title);
    if (req.body.isPublished && !req.body.publishedAt)
      req.body.publishedAt = new Date();
    if (req.body.content) {
      req.body.readTime = Math.ceil(req.body.content.split(" ").length / 200);
    }

    const post = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: post, message: "Post updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Admin: Delete post */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Post deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC READ ROUTES
═══════════════════════════════════════════════════════════════ */

/* Public: Get published posts */
router.get("/", async (req, res) => {
  try {
    const { category, tag, page = 1, limit = 9, search, featured } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (featured === "true") filter.featured = true;
    if (search)
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
      ];
    const total = await Blog.countDocuments(filter);
    const posts = await Blog.find(filter)
      .select("-content")
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({
      success: true,
      data: posts,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Public: Get post by slug */
router.get("/:slug", async (req, res) => {
  try {
    const post = await Blog.findOne({
      slug: req.params.slug,
      isPublished: true,
    });
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* View counter */
router.put("/:id/view", async (req, res) => {
  try {
    const post = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    res.json({ success: true, currentViews: post.viewCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Like */
router.put("/:id/like", protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });

    const userId = req.user.id;
    const hasLiked = blog.likes.map(String).includes(String(userId));

    if (hasLiked) {
      blog.likes = blog.likes.filter((id) => String(id) !== String(userId));
    } else {
      blog.likes.push(userId);
      blog.dislikes = blog.dislikes.filter(
        (id) => String(id) !== String(userId)
      );
    }
    await blog.save();
    res.json({
      success: true,
      likesCount: blog.likes.length,
      dislikesCount: blog.dislikes.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Dislike */
router.put("/:id/dislike", protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });

    const userId = req.user.id;
    const hasDisliked = blog.dislikes.map(String).includes(String(userId));

    if (hasDisliked) {
      blog.dislikes = blog.dislikes.filter(
        (id) => String(id) !== String(userId)
      );
    } else {
      blog.dislikes.push(userId);
      blog.likes = blog.likes.filter((id) => String(id) !== String(userId));
    }
    await blog.save();
    res.json({
      success: true,
      likesCount: blog.likes.length,
      dislikesCount: blog.dislikes.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Comment */
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Comment content cannot be empty" });
    }
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });

    blog.comments.push({
      user: req.user.id,
      userName: req.user.email || "User",
      text: text.trim(),
    });
    await blog.save();

    res
      .status(201)
      .json({ success: true, data: blog.comments, message: "Comment added." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
