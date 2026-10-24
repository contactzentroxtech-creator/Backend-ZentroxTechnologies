import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: "Email already registered" });

    const user = await User.create({ name, email: email.toLowerCase(), password, role: "user" });
    const token = generateToken(user);
    
    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/seed-admin", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@zentrox.com" });
    if (existing) return res.json({ success: true, message: "Admin exists" });

    await User.create({ name: "Admin", email: "admin@zentrox.com", password: "admin123", role: "admin", isActive: true });
    res.json({ success: true, message: "Admin created", credentials: { email: "admin@zentrox.com", password: "admin123" } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
