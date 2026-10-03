require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");

/* ═══════════════════════════════════════════════════════════════
   APP INIT
═══════════════════════════════════════════════════════════════ */
const app = express();
const PORT = process.env.PORT || 5000;

/* ═══════════════════════════════════════════════════════════════
   MIDDLEWARE
═══════════════════════════════════════════════════════════════ */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ─── CORS ─── */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://zentroxtechnologies.com",
  "https://www.zentroxtechnologies.com",
  "https://zentrox-technologies.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, postman, curl)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".netlify.app") ||
        origin.endsWith(".onrender.com")
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

/* ═══════════════════════════════════════════════════════════════
   ROUTES IMPORT
═══════════════════════════════════════════════════════════════ */
const authRoutes = require("./src/routes/auth");
const leadRoutes = require("./src/routes/leads");
const referralRoutes = require("./src/routes/referrals");
const calculatorRoutes = require("./src/routes/calculator");
const uploadRoutes = require("./src/routes/upload");
const cmsRoutes = require("./src/routes/cms");
const portfolioRoutes = require("./src/routes/portfolio");
const reviewRoutes = require("./src/routes/reviews");
const blogRoutes = require("./src/routes/blog");

/* ═══════════════════════════════════════════════════════════════
   ROUTES REGISTER
═══════════════════════════════════════════════════════════════ */
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/calculator", calculatorRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/blog", blogRoutes);

/* ═══════════════════════════════════════════════════════════════
   HEALTH CHECK
═══════════════════════════════════════════════════════════════ */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Zentrox Technologies Backend API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

/* ═══════════════════════════════════════════════════════════════
   404 HANDLER
═══════════════════════════════════════════════════════════════ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ═══════════════════════════════════════════════════════════════
   ERROR HANDLER
═══════════════════════════════════════════════════════════════ */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* ═══════════════════════════════════════════════════════════════
   START SERVER — With MongoDB Connection
═══════════════════════════════════════════════════════════════ */
const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.warn("⚠️  MONGODB_URI not set — running without DB (in-memory only)");
    } else {
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();

/* ═══════════════════════════════════════════════════════════════
   GRACEFUL SHUTDOWN
═══════════════════════════════════════════════════════════════ */
process.on("SIGTERM", async () => {
  console.log("SIGTERM received — shutting down gracefully");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});
