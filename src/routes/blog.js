const express = require("express");
const router = express.Router();
const { Blog } = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");
const slugify = require("slugify");

// =========================================================================
// ADMIN ROUTES
// =========================================================================

// Admin: get all including drafts
router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const posts = await Blog.find().sort({ createdAt: -1 });
      res.json({ success: true, data: posts });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Create Blog
router.post(
  "/",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const slug = slugify(req.body.title, { lower: true, strict: true });
      const readTime = Math.ceil(
        (req.body.content || "").split(" ").length / 200
      );
      const post = await Blog.create({
        ...req.body,
        slug,
        readTime,
        authorName: req.body.authorName || req.user.name,
        author: req.user._id,
        publishedAt: req.body.isPublished ? new Date() : undefined,
      });
      res
        .status(201)
        .json({ success: true, data: post, message: "Blog post created." });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Update Blog
router.patch(
  "/:id",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      if (req.body.title)
        req.body.slug = slugify(req.body.title, { lower: true, strict: true });
      if (req.body.isPublished && !req.body.publishedAt)
        req.body.publishedAt = new Date();

      // Recalculate read time if markdown content was updated
      if (req.body.content) {
        req.body.readTime = Math.ceil(req.body.content.split(" ").length / 200);
      }

      const post = await Blog.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.json({ success: true, data: post, message: "Post updated." });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Delete Blog
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      await Blog.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: "Post deleted." });
    } catch (err) {
      next(err);
    }
  }
);

// =========================================================================
// PUBLIC USER INTERACTIONS & READ ROUTES
// =========================================================================

// Public: Get all published blogs
router.get("/", async (req, res, next) => {
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
    next(err);
  }
});

// Public: Get dynamic post by slug
router.get("/:slug", async (req, res, next) => {
  try {
    const post = await Blog.findOne({
      slug: req.params.slug,
      isPublished: true,
    });
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });

    // await Blog.findByIdAndUpdate(post._id, { $inc: { viewCount: 1 } });
    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/view", async (req, res, next) => {
  try {
    // Atomic update avoids overlapping thread conflicts safely
    const post = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post data not available." });
    }

    res.json({ success: true, currentViews: post.viewCount });
  } catch (err) {
    next(err);
  }
});

// User Interaction: Like a blog post
router.put("/:id/like", protect, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });

    const userId = req.user._id;
    const hasLiked = blog.likes.includes(userId);

    if (hasLiked) {
      // If already liked, remove the like
      blog.likes = blog.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Add like and clean up user's potential dislike
      blog.likes.push(userId);
      blog.dislikes = blog.dislikes.filter(
        (id) => id.toString() !== userId.toString()
      );
    }

    await blog.save();
    res.json({
      success: true,
      likesCount: blog.likes.length,
      dislikesCount: blog.dislikes.length,
    });
  } catch (err) {
    next(err);
  }
});

// User Interaction: Dislike a blog post
router.put("/:id/dislike", protect, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });

    const userId = req.user._id;
    const hasDisliked = blog.dislikes.includes(userId);

    if (hasDisliked) {
      // If already disliked, remove the dislike
      blog.dislikes = blog.dislikes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Add dislike and clean up user's potential like
      blog.dislikes.push(userId);
      blog.likes = blog.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    }

    await blog.save();
    res.json({
      success: true,
      likesCount: blog.likes.length,
      dislikesCount: blog.dislikes.length,
    });
  } catch (err) {
    next(err);
  }
});

// User Interaction: Write a comment on a blog
router.post("/:id/comment", protect, async (req, res, next) => {
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

    const newComment = {
      user: req.user._id,
      userName: req.user.name, // Falls back to the decoded request user context
      text: text.trim(),
    };

    blog.comments.push(newComment);
    await blog.save();

    res
      .status(201)
      .json({ success: true, data: blog.comments, message: "Comment added." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
