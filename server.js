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

/* ═══════════════════════════════════════════════════════════════
   CORS — Allow ALL origins
═══════════════════════════════════════════════════════════════ */
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

/* Handle preflight requests */
app.options("*", cors());

/* ═══════════════════════════════════════════════════════════════
   ROUTES IMPORT — Safe loading with try/catch
═══════════════════════════════════════════════════════════════ */
const routes = [
  { path: "/api/auth", file: "./src/routes/auth" },
  { path: "/api/leads", file: "./src/routes/leads" },
  { path: "/api/referrals", file: "./src/routes/referrals" },
  { path: "/api/calculator", file: "./src/routes/calculator" },
  { path: "/api/upload", file: "./src/routes/upload" },
  { path: "/api/cms", file: "./src/routes/cms" },
  { path: "/api/portfolio", file: "./src/routes/portfolio" },
  { path: "/api/reviews", file: "./src/routes/reviews" },
  { path: "/api/blog", file: "./src/routes/blog" },
  { path: "/api/popups", file: "./src/routes/popups" },
];

routes.forEach(({ path, file }) => {
  try {
    const routeModule = require(file);
    app.use(path, routeModule);
    console.log(`✅ Registered: ${path}`);
  } catch (e) {
    console.warn(`⚠️  Skipped ${path}: ${e.message}`);
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROOT + HEALTH CHECK
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
      console.warn("⚠️  MONGODB_URI not set — running without DB");
    } else {
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(
        `🌐 Available at: https://backend-zentroxtechnologies.onrender.com`
      );
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
