const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: {
    type: String,
    enum: ["image", "video", "document", "other"],
    default: "image",
  },
  caption: { type: String, default: "" },
});

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    excerpt: { type: String },
    content: { type: String, required: true },
    category: { type: String },
    tags: [{ type: String }],
    thumbnail: { type: String },
    authorName: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    metaTitle: { type: String },
    metaDesc: { type: String },
    viewCount: { type: Number, default: 0 },
    readTime: { type: Number, default: 0 },
    publishedAt: { type: Date },

    // New Additions: Multi-media, Interactions, and Feedbacks
    media: [MediaSchema],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", BlogSchema);
