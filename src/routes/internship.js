const express = require("express");
const router = express.Router();
const {
  Internship,
  Application,
  AptitudeTest,
  TestAttempt,
  User,
} = require("../models");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  generateCertificate,
} = require("../services/certificate/certificateService");
const { sendInternshipOfferLetter } = require("../services/email/emailService");
const slugify = require("slugify");

// ==========================================
// 1. STATIC/EXPLICIT ROUTES (MUST BE ON TOP)
// ==========================================

// GET /api/internship/my/applications — student's applications
router.get("/my/applications", protect, async (req, res, next) => {
  try {
    const applications = await Application.find({ user: req.user._id })
      .populate("internship", "title domain duration type")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: applications });
  } catch (err) {
    next(err);
  }
});

// GET /api/internship/admin/applications — all applications
router.get(
  "/admin/applications",
  protect,
  authorize("admin", "mentor"), // Cleaned up double "admin" entry
  async (req, res, next) => {
    try {
      const { status, internshipId, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (internshipId) filter.internship = internshipId;

      const total = await Application.countDocuments(filter);
      const apps = await Application.find(filter)
        .populate("user", "name email phone")
        .populate("internship", "title domain")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      res.json({
        success: true,
        data: apps,
        total,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/internship — list active internships (Both Student Frontend + Admin view use this)
router.get("/", async (req, res, next) => {
  try {
    const internships = await Internship.find({ isActive: true }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: internships });
  } catch (err) {
    next(err);
  }
});

// POST /api/internship — admin create internship
router.post("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const slug = slugify(req.body.title, { lower: true, strict: true });
    console.log("I am inside the upload of internship route : ");

    // Ensure unique slug collision prevention
    const existingSlug = await Internship.findOne({ slug });
    const finalSlug = existingSlug
      ? `${slug}-${Date.now().toString().slice(-4)}`
      : slug;

    console.log("trying to create a new internship there : ");
    console.log("this is the data from the admin : ", req.body);
    const internship = await Internship.create({
      ...req.body,
      slug: finalSlug,
    });
    res.status(201).json({
      success: true,
      data: internship,
      message: "Internship created successfully.",
    });
  } catch (err) {
    console.log("I am inside od the error section with error ", err.message);
    next(err);
  }
});

// ==========================================
// 2. DYNAMIC ID/SLUG ROUTES (MUST BE BELOW)
// ==========================================

// PATCH /api/internship/applications/:appId — admin: update status
router.patch(
  "/applications/:appId",
  protect,
  authorize("admin", "mentor"),
  async (req, res, next) => {
    try {
      const { status, mentorFeedback, adminNotes } = req.body;
      const application = await Application.findById(req.params.appId).populate(
        "user internship"
      );
      if (!application)
        return res
          .status(404)
          .json({ success: false, message: "Application not found." });

      const prevStatus = application.status;
      if (status) application.status = status;
      if (mentorFeedback) application.mentorFeedback = mentorFeedback;
      if (adminNotes) application.adminNotes = adminNotes;

      if (status === "active" && prevStatus !== "active") {
        application.startedAt = new Date();
        await User.findByIdAndUpdate(application.user._id, {
          internshipStatus: "active",
        });
        await sendInternshipOfferLetter(
          application.user,
          application,
          application.internship
        );
        application.offerLetterSent = true;
      }
      if (status === "completed") {
        application.completedAt = new Date();
        await User.findByIdAndUpdate(application.user._id, {
          internshipStatus: "completed",
        });
        const { cert } = await generateCertificate({
          userId: application.user._id,
          userName: application.user.name,
          userEmail: application.user.email,
          type: "internship",
          internshipRole: application.internship.title,
          internshipDuration: application.internship.duration,
          internshipId: application.internship._id,
        });
        application.completionCertSent = true;
        await User.findByIdAndUpdate(application.user._id, {
          $addToSet: { certificates: cert._id },
        });
      }

      await application.save();
      res.json({
        success: true,
        data: application,
        message: "Application updated.",
      });
    } catch (err) {
      next(err);
    }
  }
);

// Modifying the existing internship //

router.get("/:id", async (req, res, next) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship) {
      return res
        .status(404)
        .json({ success: false, message: "Internship ID not found." });
    }
    res.json({ success: true, data: internship });
  } catch (err) {
    next(err);
  }
});

// PUT /api/internship/:id — Admin: Update an internship configuration profile
router.put("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const internship = await Internship.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!internship) {
      return res
        .status(404)
        .json({ success: false, message: "Internship not found to update." });
    }

    res.json({
      success: true,
      data: internship,
      message: "Internship workspace updated successfully.",
    });
  } catch (err) {
    next(err);
  }
});

// NEW: DELETE /api/internship/:id — admin: delete or safely disable an internship
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const internship = await Internship.findByIdAndDelete(req.params.id);
    if (!internship) {
      return res
        .status(404)
        .json({ success: false, message: "Internship not found." });
    }
    res.json({ success: true, message: "Internship permanently removed." });
  } catch (err) {
    next(err);
  }
});

// GET /api/internship/:id/test — fetch aptitude test (without correct answers)
router.get("/:id/test", protect, async (req, res, next) => {
  try {
    const application = await Application.findOne({
      user: req.user._id,
      internship: req.params.id,
    });
    if (!application || application.aptitudeAttempted) {
      return res.status(400).json({
        success: false,
        message: "Test not available or already attempted.",
      });
    }
    const test = await AptitudeTest.findOne({
      internship: req.params.id,
      isActive: true,
    });
    if (!test)
      return res
        .status(404)
        .json({ success: false, message: "Test not found." });

    const sanitized = test.questions.map(
      ({ _id, question, options, category, difficulty }) => ({
        _id,
        question,
        options,
        category,
        difficulty,
      })
    );
    res.json({
      success: true,
      data: { questions: sanitized, duration: test.duration, testId: test._id },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/internship/:id/test/submit
router.post("/:id/test/submit", protect, async (req, res, next) => {
  try {
    const { testId, answers, timeTaken } = req.body;
    const application = await Application.findOne({
      user: req.user._id,
      internship: req.params.id,
    });
    if (!application || application.aptitudeAttempted) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot submit test." });
    }

    const test = await AptitudeTest.findById(testId);
    if (!test)
      return res
        .status(404)
        .json({ success: false, message: "Test not found." });

    let correct = 0;
    answers.forEach(({ questionId, selectedIndex }) => {
      const q = test.questions.id(questionId);
      if (q && q.correctIndex === selectedIndex) correct++;
    });
    const score = Math.round((correct / test.questions.length) * 100);
    const passed = score >= test.passingScore;

    await TestAttempt.create({
      user: req.user._id,
      test: testId,
      internship: req.params.id,
      answers,
      score,
      passed,
      timeTaken,
      startedAt: new Date(Date.now() - timeTaken * 1000),
      submittedAt: new Date(),
    });

    application.aptitudeAttempted = true;
    application.aptitudeAttemptedAt = new Date();
    application.aptitudeScore = score;
    application.status = passed ? "test-passed" : "test-failed";
    await application.save();

    res.json({
      success: true,
      data: { score, passed, correct, total: test.questions.length },
      message: passed
        ? `Congratulations! You scored ${score}%. Our team will review your application.`
        : `You scored ${score}%. Minimum required is ${test.passingScore}%.`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/internship/:id/apply
router.post("/:id/apply", protect, async (req, res, next) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship || !internship.isActive)
      return res
        .status(404)
        .json({ success: false, message: "Internship not available." });
    if (internship.filledSlots >= internship.maxSlots)
      return res
        .status(409)
        .json({ success: false, message: "All slots filled." });

    const existing = await Application.findOne({
      user: req.user._id,
      internship: req.params.id,
    });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Already applied." });

    const application = await Application.create({
      user: req.user._id,
      internship: req.params.id,
      status: internship.aptitudeTestRequired ? "test-pending" : "pending",
    });

    res.status(201).json({
      success: true,
      data: application,
      message: internship.aptitudeTestRequired
        ? "Applied! Complete the aptitude test to proceed."
        : "Application submitted successfully.",
      requiresTest: internship.aptitudeTestRequired,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/internship/:slug — public detail view string matcher (MUST BE AT THE VERY BOTTOM)
router.get("/:slug", async (req, res, next) => {
  try {
    const internship = await Internship.findOne({
      slug: req.params.slug,
      isActive: true,
    });
    if (!internship)
      return res
        .status(404)
        .json({ success: false, message: "Internship not found." });
    res.json({ success: true, data: internship });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
