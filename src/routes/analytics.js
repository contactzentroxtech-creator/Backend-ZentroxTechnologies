// analytics.js
const express = require("express");
const router = express.Router();
const { Analytics, Lead, Enrollment, Application } = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get(
  "/overview",
  protect,
  authorize("admin", "admin"),
  async (req, res, next) => {
    try {
      const { days = 30 } = req.query;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [leadsPerDay, enrollmentsPerDay, appsPerDay] = await Promise.all([
        Lead.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Enrollment.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Application.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      res.json({
        success: true,
        data: { leadsPerDay, enrollmentsPerDay, appsPerDay },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
