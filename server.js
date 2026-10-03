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
   ROUTES IMPORT — Safe require (missing route = skip)
═══════════════════════════════════════════════════════════════ */
let authRoutes, leadRoutes, referralRoutes, calculatorRoutes;
let uploadRoutes, cmsRoutes, portfolioRoutes, reviewRoutes, blogRoutes;

try { authRoutes = require("./src/routes/auth"); } catch (e) { console.warn("⚠️  auth route missing"); }
try { leadRoutes = require("./src/routes/leads"); } catch (e) { console.warn("⚠️  leads route missing"); }
try { referralRoutes = require("./src/routes/referrals"); } catch (e) { console.warn("⚠️  referrals route missing"); }
try { calculatorRoutes = require("./src/routes/calculator"); } catch (e) { console.warn("⚠️  calculator route missing"); }
try { uploadRoutes = require("./src/routes/upload"); } catch (e) { console.warn("⚠️  upload route missing:", e.message); }
try { cmsRoutes = require("./src/routes/cms"); } catch (e) { console.warn("⚠️  cms route missing:", e.message); }
try { portfolioRoutes = require("./src/routes/portfolio"); } catch (e) { console.warn("⚠️  portfolio route missing"); }
try { reviewRoutes = require("./src/routes/reviews"); } catch (e) { console.warn("⚠️  reviews route missing"); }
try { blogRoutes = require("./src/routes/blog"); } catch (e) { console.warn("⚠️  blog route missing"); }

/* ═══════════════════════════════════════════════════════════════
   ROUTES REGISTER
═══════════════════════════════════════════════════════════════ */
if (authRoutes) app.use("/api/auth", authRoutes);
if (leadRoutes) app.use("/api/leads", leadRoutes);
if (referralRoutes) app.use("/api/referrals", referralRoutes);
if (calculatorRoutes) app.use("/api/calculator", calculatorRoutes);
if (uploadRoutes) app.use("/api/upload", uploadRoutes);
if (cmsRoutes) app.use("/api/cms", cmsRoutes);
if (portfolioRoutes) app.use("/api/portfolio", portfolioRoutes);
if (reviewRoutes) app.use("/api/reviews", reviewRoutes);
if (blogRoutes) app.use("/api/blog", blogRoutes);

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
  });
});

/* ═══════════════════════════════════════════════════════════════
   START SERVER
═══════════════════════════════════════════════════════════════ */
const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.warn("⚠️  MONGODB_URI not set");
    } else {
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
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
  console.log("SIGTERM received — shutting down");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});
