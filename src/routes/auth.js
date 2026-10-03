const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* ═══════════════════════════════════════════════════════════════
   USER MODEL (inline — no dependency on models folder)
═══════════════════════════════════════════════════════════════ */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: "user", enum: ["user", "admin", "mentor"] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

/* ═══════════════════════════════════════════════════════════════
   HELPER — JWT generate
═══════════════════════════════════════════════════════════════ */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/* ═══════════════════════════════════════════════════════════════
   AUTH MIDDLEWARE (inline)
═══════════════════════════════════════════════════════════════ */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/register
═══════════════════════════════════════════════════════════════ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/login
═══════════════════════════════════════════════════════════════ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/auth/me
═══════════════════════════════════════════════════════════════ */
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/logout
═══════════════════════════════════════════════════════════════ */
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out" });
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/seed-admin — ONE-TIME admin creation
   ⚠️ DELETE this route after first admin is created
═══════════════════════════════════════════════════════════════ */
router.post("/seed-admin", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@zentrox.com" });
    if (existing) {
      return res.json({
        success: true,
        message: "Admin already exists",
        credentials: { email: "admin@zentrox.com" },
      });
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      name: "Admin",
      email: "admin@zentrox.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    res.json({
      success: true,
      message: "Admin created successfully",
      credentials: {
        email: "admin@zentrox.com",
        password: "admin123",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
