/**
 * seedAdmin.js
 * Creates the default super_admin account if it doesn't already exist.
 * Run: node src/scripts/seedAdmin.js
 */
// 1. Force IPv4 resolution first so Node can find your Atlas cluster
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config();
const mongoose = require("mongoose");
const { User } = require("../models");

const ADMIN_EMAIL = "contact.zentroxtech@gmail.com";
const ADMIN_PASSWORD = "ZentroxAdmin@2025";
const ADMIN_NAME = "Zentrox Admin";
const ADMIN_ROLE = "admin";

async function seed() {
  try {
    console.log("Connecting to MongoDB Atlas...");

    // 2. Connect using the validated connection string and configuration
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined in your environment variables."
      );
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "zentrox_technologies",
    });
    console.log("✅  MongoDB connected — Zentrox Technologies");

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      // Ensure role is admin and account is active
      if (existing.role !== ADMIN_ROLE || !existing.isActive) {
        existing.role = ADMIN_ROLE;
        existing.isActive = true;
        await existing.save();
        console.log("✅  Existing admin account updated to admin + active");
      } else {
        console.log("ℹ️   Admin account already exists — no changes needed");
      }
    } else {
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: ADMIN_ROLE,
        isActive: true,
        isEmailVerified: true,
      });
      console.log(
        `✅  Default admin created → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`
      );
    }

    console.log("\n🚀  Login at: http://localhost:3000/auth/login");
    console.log(`    Email   : ${ADMIN_EMAIL}`);
    console.log(`    Password: ${ADMIN_PASSWORD}`);
    console.log("    Admin panel: http://localhost:3000/admin\n");
  } catch (err) {
    console.error("❌  Seed failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
