const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { Course, Enrollment, User } = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");
const slugify = require("slugify");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  next();
};

// =========================================================================
// NEW: PUBLIC SATURDAY LIVE CLASS ROUTES (No Auth Required)
// =========================================================================

/**
 * @route   GET /api/courses/saturday/live-classes
 * @desc    Fetch courses containing active live Saturday setup targets
 */
router.get("/saturday/live-classes", async (req, res, next) => {
  try {
    // Finds courses that have an active live Saturday field configured
    const liveCourses = await Course.find({
      isLive: true,
      isPublished: true,
      saturdayClass: { $exists: true },
    });

    // Format fields to precisely line up with what your frontend UI state maps
    const formattedClasses = liveCourses.map((course) => {
      const sc = course.saturdayClass || {};
      const targetDate = sc.scheduledSaturday || new Date();

      return {
        _id: course._id, // Mapping the Course ID as the class handle references
        title: course.title,
        topic: sc.topic || "Core Framework Practical Session",
        description: course.description || sc.description,
        fullDate: targetDate.toISOString(),
        dateString: targetDate.toLocaleDateString("en-IN", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        timeString: sc.timeString || "Every Saturday — 10:00 AM IST",
        platform: sc.platform || "YouTube",
        link: sc.link || "",
        status: course.isLive ? "LIVE" : "SOON",
        syllabus: sc.syllabus || [],
      };
    });

    res.json(formattedClasses);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/courses/saturday/register
 * @desc    Anonymous context enrollment tracking for specific Saturday Slots
 */
router.post(
  "/saturday/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("whatsapp")
      .trim()
      .notEmpty()
      .withMessage("WhatsApp number is required"),
    body("email")
      .isEmail()
      .withMessage("Please enter a valid professional email"),
    body("classId")
      .notEmpty()
      .withMessage("Target session class identification handle is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, whatsapp, email, classId } = req.body;

      const course = await Course.findById(classId);
      if (!course) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Target workshop session course slot not found.",
          });
      }

      // Safeguard array structure base initialization
      if (!course.saturdayClass) {
        course.saturdayClass = {};
      }
      if (!course.saturdayClass.enrolledStudents) {
        course.saturdayClass.enrolledStudents = [];
      }

      // Check for double registrations on this specific track segment
      const alreadyRegistered = course.saturdayClass.enrolledStudents.some(
        (student) => student.whatsapp === whatsapp || student.email === email,
      );

      if (alreadyRegistered) {
        return res.status(409).json({
          success: false,
          message:
            "You have already claimed a free seat for this session track.",
        });
      }

      // Push tracking entry matrix into document record array
      course.saturdayClass.enrolledStudents.push({
        name,
        whatsapp,
        email,
        registeredAt: new Date(),
      });
      await course.save();

      res.status(201).json({
        success: true,
        message: "Seat claimed successfully! Registration matrix parsed.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// =========================================================================
// STANDARD BASE ROUTE LOGIC
// =========================================================================

// GET /api/courses — public listing
router.get("/", async (req, res, next) => {
  try {
    const {
      category,
      level,
      isFree,
      isFeatured,
      isLive,
      page = 1,
      limit = 12,
      search,
    } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (isFree === "true") filter.isFree = true;
    if (isFeatured === "true") filter.isFeatured = true;
    if (isLive === "true") filter.isLive = true;
    if (search)
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    const total = await Course.countDocuments(filter);
    const courses = await Course.find(filter)
      .select("-modules")
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({
      success: true,
      data: courses,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/:slug — single course
router.get("/:slug", async (req, res, next) => {
  try {
    const course = await Course.findOne({
      slug: req.params.slug,
      isPublished: true,
    });
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found." });
    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
});

// POST /api/courses — admin create
router.post(
  "/",
  protect,
  authorize("admin"),
  [
    body("title").trim().notEmpty(),
    body("category").notEmpty(),
    body("description").notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const slug = slugify(req.body.title, { lower: true, strict: true });
      const course = await Course.create({
        ...req.body,
        slug,
        instructorName: req.body.instructorName || req.user.name,
        instructor: req.user._id,
      });
      res
        .status(201)
        .json({ success: true, data: course, message: "Course created." });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/courses/:id — admin update
router.patch("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    if (req.body.title)
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found." });
    res.json({ success: true, data: course, message: "Course updated." });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/courses/:id
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Course deleted." });
  } catch (err) {
    next(err);
  }
});

// POST /api/courses/:id/enroll
router.post("/:id/enroll", protect, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found." });

    const existing = await Enrollment.findOne({
      user: req.user._id,
      course: req.params.id,
    });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Already enrolled in this course." });

    if (!course.isFree && course.price > 0) {
      return res.status(402).json({
        success: false,
        message: "Payment required.",
        requiresPayment: true,
        courseId: course._id,
      });
    }

    const enrollment = await Enrollment.create({
      user: req.user._id,
      course: req.params.id,
    });
    await Course.findByIdAndUpdate(req.params.id, {
      $inc: { enrolledCount: 1 },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { enrolledCourses: req.params.id },
    });

    res.status(201).json({
      success: true,
      data: enrollment,
      message: "Enrolled successfully!",
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/courses/:id/progress — update lesson progress
router.patch("/:id/progress", protect, async (req, res, next) => {
  try {
    const { lessonId, totalLessons } = req.body;
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: req.params.id,
    });
    if (!enrollment)
      return res.status(404).json({ success: false, message: "Not enrolled." });

    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }
    enrollment.progress = Math.round(
      (enrollment.completedLessons.length / totalLessons) * 100,
    );
    enrollment.lastAccessedAt = new Date();
    if (enrollment.progress >= 100) enrollment.completedAt = new Date();
    await enrollment.save();

    res.json({ success: true, data: enrollment, message: "Progress updated." });
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/admin/all — admin: all courses including unpublished
router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const courses = await Course.find().sort({ createdAt: -1 });
      res.json({ success: true, data: courses });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
