import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

/* ───────── ROUTES ───────── */
import authRoutes from "./routes/authRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import cmsRoutes from "./routes/cmsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import careerRoutes from "./routes/careerRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ═══════════════════════════════════════════
   1. SECURITY & MIDDLEWARE
   ═══════════════════════════════════════════ */

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS — frontend + localhost dono allow
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://zentroxtechnologies.com",
  "https://www.zentroxtechnologies.com",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman/mobile
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logger (sirf dev mein detail)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Rate limiting — API abuse se bachao
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try again later." },
});
app.use("/api", apiLimiter);

/* ═══════════════════════════════════════════
   2. HEALTH CHECK
   ═══════════════════════════════════════════ */

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Zentrox Technologies API running 🚀",
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

app.get("/api/health", async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? "connected" :
    dbState === 2 ? "connecting" :
    dbState === 3 ? "disconnecting" : "disconnected";

  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    db: dbStatus,
    uptime: Math.floor(process.uptime()) + "s",
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
  });
});

/* ═══════════════════════════════════════════
   3. API ROUTES
   ═══════════════════════════════════════════ */

app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);           // ⭐ Blog routes
app.use("/api/cms", cmsRoutes);             // Hero image, settings
app.use("/api/upload", uploadRoutes);       // Cloudinary upload
app.use("/api/contact", contactRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/careers", careerRoutes);
app.use("/api/quote", quoteRoutes);
app.use("/api/newsletter", newsletterRoutes);

/* ═══════════════════════════════════════════
   4. 404 HANDLER
   ═══════════════════════════════════════════ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ═══════════════════════════════════════════
   5. GLOBAL ERROR HANDLER
   ═══════════════════════════════════════════ */

app.use((err, _req, res, _next) => {
  console.error("❌ Error:", err.message);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors).map((e) => e.message).join(", "),
    });
  }

  // Invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}`,
    });
  }

  // CORS
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

/* ═══════════════════════════════════════════
   6. DATABASE CONNECT + START SERVER
   ═══════════════════════════════════════════ */

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Env: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Allowed origins:`, allowedOrigins.join(", "));
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

/* ═══════════════════════════════════════════
   7. GRACEFUL SHUTDOWN
   ═══════════════════════════════════════════ */

const shutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down...`);
  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

startServer();
