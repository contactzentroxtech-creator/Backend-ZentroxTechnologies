// ... rest of your code (express, mongoose config, etc.)
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const { errorHandler, notFound } = require("./src/middleware/errorMiddleware");
const logger = require("./src/utils/logger");

// Route imports
const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/users");
const leadRoutes = require("./src/routes/leads");
const courseRoutes = require("./src/routes/courses");
const internshipRoutes = require("./src/routes/internship");
const certificateRoutes = require("./src/routes/certificates");
const blogRoutes = require("./src/routes/blog");
const adminRoutes = require("./src/routes/admin");
const cmsRoutes = require("./src/routes/cms");
const paymentRoutes = require("./src/routes/payments");
const analyticsRoutes = require("./src/routes/analytics");
const uploadRoutes = require("./src/routes/upload");
const pricingRoutes = require("./src/routes/pricing");
const translationRoutes = require("./src/routes/translations");
const saturdayClassRoutes = require("./src/routes/saturdayClass");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(mongoSanitize());
app.use(hpp());

// ─── CORS ───────────────────────────────────────────────────────────────────

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", // Added for Vite developers just in case
  "https://zentroxtechnologies.com",
  "https://www.zentroxtechnologies.com",
  "https://frontend-zentroxtechnologies.netlify.app",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Handle preflight for all routes
app.options("*", cors());

// ─── Cookie Parser ──────────────────────────────────────────────────────────
// FIX: required to read req.cookies.refreshToken in /auth/refresh
app.use(cookieParser());

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many auth attempts, please try again later.",
  },
});

app.use(globalLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Logging ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ─── Health Check ───────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    company: "Zentrox Technologies",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/internship", internshipRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/saturday-class", saturdayClassRoutes);

// ─── 404 + Error Handlers ───────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Database + Start ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI, { dbName: "zentrox_technologies" })
  .then(() => {
    logger.info("MongoDB connected — Zentrox Technologies");
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection failed:", err);
    process.exit(1);
  });

module.exports = app;
