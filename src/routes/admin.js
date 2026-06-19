// admin.js
const express = require("express");
const router = express.Router();
const {
  User,
  Lead,
  Course,
  Enrollment,
  Application,
  Certificate,
  Blog,
  Analytics,
} = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");

const adminAuth = [protect, authorize("admin", "admin")];

// Dashboard overview stats
router.get("/dashboard", ...adminAuth, async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalLeads,
      totalCourses,
      totalEnrollments,
      totalApplications,
      totalCertificates,
      totalBlogPosts,
      newLeadsToday,
      recentLeads,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      Lead.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Enrollment.countDocuments(),
      Application.countDocuments(),
      Certificate.countDocuments(),
      Blog.countDocuments({ isPublished: true }),
      Lead.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Lead.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name phone service status createdAt"),
      User.find({ role: "student" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email createdAt"),
    ]);

    // Lead status breakdown
    const leadsByStatus = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const applicationsByStatus = await Application.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalLeads,
          totalCourses,
          totalEnrollments,
          totalApplications,
          totalCertificates,
          totalBlogPosts,
          newLeadsToday,
        },
        leadsByStatus,
        applicationsByStatus,
        recentLeads,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Users management
router.get("/users", ...adminAuth, async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search)
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({
      success: true,
      data: users,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/users/:id",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { role, isActive } = req.body;
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role, isActive },
        { new: true }
      );
      res.json({ success: true, data: user, message: "User updated." });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
