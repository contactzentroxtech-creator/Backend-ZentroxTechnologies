const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { User } = require("../models");
const {
  sendTokenResponse,
  generateSecureToken,
} = require("../utils/tokenUtils");
const {
  sendWelcomeEmail,
  sendPasswordReset,
} = require("../services/email/emailService");
const { protect } = require("../middleware/authMiddleware");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ max: 80 }),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("phone").optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      console.log("inside of the body : ", req.body);

      const { name, email, password, phone } = req.body;
      const exists = await User.findOne({ email });
      if (exists)
        return res
          .status(409)
          .json({ success: false, message: "Email already registered." });

      const user = await User.create({ name, email, password, phone });
      sendWelcomeEmail(user).catch(() => {});
      sendTokenResponse(res, user, 201, "Account created successfully.");
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      console.log("I am inside the auth", req.body);
      console.log("Hey there");
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");
      console.log("this is the user in the database : ", user);
      if (!user) {
        console.log(
          "Hi this side instide form if block of !use from login auth.js"
        );
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password." });
      }
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        console.log("I am from not matched passowrd");
        return res.status(401).json({ message: "Invalid email or password" });
      }
      // if (!user.isActive) {
      //   console.log("I am from second block");
      //   return res.status(403).json({
      //     success: false,
      //     message: "Account deactivated. Contact support.",
      //   });
      // }
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
      sendTokenResponse(res, user, 200, "Login successful.");
    } catch (err) {
      console.log("I am from the catch block what to do next");
      next(err);
    }
  }
);

// POST /api/auth/refresh
router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "No refresh token." });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive)
      return res
        .status(401)
        .json({ success: false, message: "Invalid session." });
    sendTokenResponse(res, user, 200, "Token refreshed.");
  } catch (err) {
    res
      .status(401)
      .json({ success: false, message: "Refresh token invalid or expired." });
  }
});

// POST /api/auth/logout
router.post("/logout", protect, (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully." });
});

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user)
        return res.json({
          success: true,
          message: "If that email exists, a reset link has been sent.",
        });
      const token = generateSecureToken();
      user.passwordResetToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
      await sendPasswordReset(user, resetUrl);
      res.json({ success: true, message: "Password reset email sent." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  [
    body("token").notEmpty(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const hashedToken = crypto
        .createHash("sha256")
        .update(req.body.token)
        .digest("hex");
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });
      if (!user)
        return res
          .status(400)
          .json({ success: false, message: "Token invalid or expired." });
      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      res.json({ success: true, message: "Password reset successfully." });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get("/me", protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
