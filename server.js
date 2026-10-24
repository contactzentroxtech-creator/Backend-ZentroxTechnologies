import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

app.use(
  "/api",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 500 })
);

/* ══════ HEALTH ══════ */
app.get("/", (_req, res) => res.json({ success: true, message: "API running 🚀" }));
app.get("/api/health", (_req, res) => res.json({ success: true, db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

/* ══════ ROUTES (Purane naamo ke hisaab se) ══════ */
import authRoutes from "./routes/authRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import cmsRoutes from "./routes/cmsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/upload", uploadRoutes);

/* ══════ 404 + ERROR ══════ */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});

/* ══════ START ══════ */
const start = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
};

start();
