const express = require('express');
const router = express.Router();
const { User, Enrollment, Application, Certificate } = require('../models');
const { protect } = require('../middleware/authMiddleware');

// GET /api/users/dashboard — student dashboard data
router.get('/dashboard', protect, async (req, res, next) => {
  try {
    const [enrollments, applications, certificates] = await Promise.all([
      Enrollment.find({ user: req.user._id }).populate('course', 'title thumbnail category level totalLessons'),
      Application.find({ user: req.user._id }).populate('internship', 'title domain duration'),
      Certificate.find({ issuedTo: req.user._id }),
    ]);
    res.json({
      success: true,
      data: {
        user: req.user,
        enrollments,
        applications,
        certificates,
        stats: {
          coursesEnrolled: enrollments.length,
          coursesCompleted: enrollments.filter(e => e.progress >= 100).length,
          internshipsApplied: applications.length,
          internshipsActive: applications.filter(a => a.status === 'active').length,
          certificatesEarned: certificates.length,
        },
      },
    });
  } catch (err) { next(err); }
});

// PATCH /api/users/profile
router.patch('/profile', protect, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'profileData'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user, message: 'Profile updated.' });
  } catch (err) { next(err); }
});

module.exports = router;
