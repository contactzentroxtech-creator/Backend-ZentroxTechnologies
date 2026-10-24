import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

/* ───────── ROUTES ───────── */
import authRoutes from "./routes/auth.js";
import blogRoutes from "./routes/blog.js";
import cmsRoutes from "./routes/cms.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ═══════════════════════════════════════════
   SECURITY & MIDDLEWARE
   ═══════════════════════════════════════════ */
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

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
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try again later." },
});
app.use("/api", apiLimiter);

/* ═══════════════════════════════════════════
   HEALTH CHECK
   ═══════════════════════════════════════════ */
app.get("/", (_req, res) => {
  res.json({ success: true, message: "Zentrox API running 🚀" });
});

app.get("/api/health", async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    db: dbState === 1 ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()) + "s",
  });
});

/* ═══════════════════════════════════════════
   API ROUTES
   ═══════════════════════════════════════════ */
app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/upload", uploadRoutes);

/* ═══════════════════════════════════════════
   404 + ERROR HANDLERS
   ═══════════════════════════════════════════ */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error("❌ Error:", err.message);
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join(", ") });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});

/* ═══════════════════════════════════════════
   DATABASE CONNECT + START SERVER
   ═══════════════════════════════════════════ */
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
