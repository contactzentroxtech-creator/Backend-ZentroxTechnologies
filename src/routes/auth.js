const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

/* ═══════════════════════════════════════════════════════════════
   USER MODEL — reuse existing from models/index.js
   ⚠️ Inline define mat karo, warna "Cannot overwrite User model" error
═══════════════════════════════════════════════════════════════ */
let User;
try {
  const models = require("../models");
  User = models.User;
} catch (e) {
  const userSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true, select: false },
      role: { type: String, default: "user", enum: ["user", "admin", "mentor"] },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  User = mongoose.models.User || mongoose.model("User", userSchema);
}

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
   ⚠️ IMPORTANT: select("+password") — warna user.password undefined
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

    // "+password" zaroori hai — warna password field load nahi hota
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(500).json({
        success: false,
        message: "Password not set for this user. Please use reset-admin.",
      });
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
    console.error("LOGIN ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/seed-admin — ONE TIME only
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
    await User.create({
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

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/reset-admin — Password reset (recovery)
═══════════════════════════════════════════════════════════════ */
router.post("/reset-admin", async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    const targetEmail = (email || "admin@zentrox.com").toLowerCase();
    const targetPassword = newPassword || "admin123";

    const hashedPassword = await bcrypt.hash(targetPassword, 10);

    // Use findOneAndUpdate with option to include password on return
    const admin = await User.findOneAndUpdate(
      { email: targetEmail },
      {
        email: targetEmail,
        password: hashedPassword,
        role: "admin",
        isActive: true,
        name: "Admin",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: `Admin password reset for ${targetEmail}`,
      credentials: {
        email: targetEmail,
        password: targetPassword,
      },
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/auth/me — Auth check
═══════════════════════════════════════════════════════════════ */
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/logout
═══════════════════════════════════════════════════════════════ */
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out" });
});

module.exports = router;
