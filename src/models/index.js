const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─── USER MODEL ─────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: ["student", "admin", "admin", "mentor"],
      default: "student",
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    lastLogin: Date,
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    internshipStatus: {
      type: String,
      enum: ["none", "applied", "active", "completed"],
      default: "none",
    },
    certificates: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Certificate" },
    ],
    profileData: {
      bio: String,
      skills: [String],
      github: String,
      linkedin: String,
      portfolio: String,
      college: String,
      city: String,
      state: String,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerifyToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ─── COURSE MODEL ────────────────────────────────────────────────────────────
const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  videoUrl: String,
  duration: Number, // minutes
  order: Number,
  resources: [{ name: String, url: String }],
  isPreview: { type: Boolean, default: false },
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    shortDesc: String,
    thumbnail: String,
    previewVideo: String,
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    instructorName: String,
    category: {
      type: String,
      enum: [
        "web-dev",
        "mobile",
        "ai-ml",
        "seo",
        "design",
        "devops",
        "fullstack",
      ],
      required: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    price: { type: Number, default: 0 },
    discountPrice: Number,
    isFree: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isLive: { type: Boolean, default: false },
    nextLiveDate: Date,
    liveSchedule: String, // e.g. "Every Saturday 10:00 AM IST"
    modules: [
      {
        title: String,
        order: Number,
        lessons: [lessonSchema],
      },
    ],
    totalDuration: Number,
    totalLessons: { type: Number, default: 0 },
    enrolledCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    tags: [String],
    outcomes: [String],
    requirements: [String],
    certificate: { type: Boolean, default: true },
    language: { type: String, default: "Hindi/English" },
    isPublished: { type: Boolean, default: false },
    metaTitle: String,
    metaDesc: String,
  },
  { timestamps: true },
);

// ─── ENROLLMENT MODEL ────────────────────────────────────────────────────────
const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrolledAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 }, // percentage
    completedLessons: [String],
    lastAccessedAt: Date,
    completedAt: Date,
    paymentId: String,
    amountPaid: Number,
    certificateIssued: { type: Boolean, default: false },
    certificateId: { type: mongoose.Schema.Types.ObjectId, ref: "Certificate" },
  },
  { timestamps: true },
);
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

// ─── CERTIFICATE MODEL ───────────────────────────────────────────────────────
const certificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: [
        "course",
        "internship",
        "offer-letter",
        "completion",
        "recommendation",
      ],
      required: true,
    },
    issuedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientName: String,
    recipientEmail: String,
    courseName: String,
    internshipRole: String,
    internshipDuration: String,
    issuedBy: { type: String, default: "Zentrox Technologies" },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    pdfUrl: String,
    qrCodeUrl: String,
    verifyUrl: String,
    isValid: { type: Boolean, default: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

// ─── INTERNSHIP MODEL ────────────────────────────────────────────────────────
const internshipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    company: {
      type: String,
      required: [true, "Please add a company name"],
      default: "Zentrox Technologies",
    },
    domain: {
      type: String,
      required: [true, "Please specify the domain (e.g., Web Development)"],
    },
    location: {
      type: String,
      required: [true, "Please specify a location"],
    },
    duration: {
      type: String,
      required: [true, "Please specify duration (e.g., 6 Months)"],
    },
    type: {
      type: String,
      required: true,
      enum: ["Remote", "Hybrid", "On-site"],
      default: "Remote",
    },
    stipend: {
      type: String,
      required: [true, "Please state the stipend or write Performance Based"],
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    maxSlots: {
      type: Number,
      required: [true, "Please enter maximum capacity slots"],
      default: 10,
    },
    filledSlots: {
      type: Number,
      default: 0,
    },
    aptitudeTestRequired: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// ─── INTERNSHIP APPLICATION ───────────────────────────────────────────────────
const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "test-pending",
        "test-passed",
        "test-failed",
        "accepted",
        "active",
        "completed",
        "rejected",
      ],
      default: "pending",
    },
    aptitudeScore: Number,
    aptitudeAttempted: { type: Boolean, default: false },
    aptitudeAttemptedAt: Date,
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    progress: { type: Number, default: 0 },
    completedTasks: [
      { taskId: String, submittedAt: Date, feedback: String, score: Number },
    ],
    mentorFeedback: String,
    adminNotes: String,
    offerLetterSent: { type: Boolean, default: false },
    completionCertSent: { type: Boolean, default: false },
    recommendationLetterSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);
applicationSchema.index({ user: 1, internship: 1 }, { unique: true });

// ─── SATURDAY LIVE CLASS MODEL ──────────────────────────────────────────────────────────────

const liveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    topic: { type: String, required: true },
    description: { type: String },
    dateString: { type: String, required: true }, // e.g., "17 MAY" or "24 MAY"
    fullDate: { type: Date, required: true }, // Used to track real countdown targets
    timeString: { type: String, default: "10:00 AM – 12:30 PM IST" },
    platform: { type: String, enum: ["YouTube", "Zoom"], default: "YouTube" },
    link: { type: String, required: true }, // Stream link or Meet link
    status: { type: String, enum: ["LIVE", "SOON"], default: "SOON" },
    syllabus: [{ type: String }], // Array items outlining subtopics
  },
  { timestamps: true },
);

// ─── LEAD MODEL ──────────────────────────────────────────────────────────────
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    service: String,
    budget: String,
    message: String,
    source: { type: String, default: "website" },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "proposal", "won", "lost"],
      default: "new",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: [
      {
        text: String,
        addedBy: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],
    followUpDate: Date,
    city: String,
    businessType: String,
    timeline: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true },
);

// ─── SLOT BOOKING FOR SATURDAY MODEL ──────────────────────────────────────────────────────────────
const SlotBookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  whatsapp: { type: String, required: true },
  email: { type: String, required: true },
  // 1. Calculated target tracking parameters
  scheduledSaturday: { type: Date },

  // 2. The Auto-Cleanup Variable: Documents expire automatically 30 days after creation
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000, // Time in seconds (30 days)
  },
});
// ─── BLOG MODEL ──────────────────────────────────────────────────────────────
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    excerpt: String,
    content: { type: String, required: true },
    thumbnail: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: String,
    category: String,
    tags: [String],
    isPublished: { type: Boolean, default: false },
    publishedAt: Date,
    viewCount: { type: Number, default: 0 },
    readTime: Number,
    metaTitle: String,
    metaDesc: String,
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ─── CMS / SITE SETTINGS ─────────────────────────────────────────────────────
const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ["text", "image", "json", "boolean", "number", "color"],
    },
    label: String,
    group: String,
  },
  { timestamps: true },
);

// ─── POPUP MODEL ─────────────────────────────────────────────────────────────
const popupSchema = new mongoose.Schema(
  {
    name: String,
    type: {
      type: String,
      enum: [
        "exit-intent",
        "lead",
        "newsletter",
        "discount",
        "whatsapp",
        "internship",
        "announcement",
      ],
    },
    title: String,
    content: String,
    ctaText: String,
    ctaLink: String,
    image: String,
    isActive: { type: Boolean, default: false },
    trigger: { type: String, enum: ["time", "scroll", "exit", "click"] },
    triggerValue: Number,
    showOnce: { type: Boolean, default: true },
    targetPages: [String],
    scheduledFrom: Date,
    scheduledTo: Date,
  },
  { timestamps: true },
);

// ─── ANALYTICS MODEL ─────────────────────────────────────────────────────────
const analyticsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    pageViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    leadsGenerated: { type: Number, default: 0 },
    coursesEnrolled: { type: Number, default: 0 },
    internshipsApplied: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    topPages: [{ page: String, views: Number }],
    sources: [{ source: String, count: Number }],
  },
  { timestamps: true },
);

// ─── APTITUDE TEST ────────────────────────────────────────────────────────────
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctIndex: { type: Number, required: true },
  explanation: String,
  category: { type: String, enum: ["aptitude", "technical", "logical"] },
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
});
const aptitudeTestSchema = new mongoose.Schema(
  {
    internship: { type: mongoose.Schema.Types.ObjectId, ref: "Internship" },
    questions: [questionSchema],
    duration: { type: Number, default: 30 }, // minutes
    passingScore: { type: Number, default: 60 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const testAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AptitudeTest",
      required: true,
    },
    internship: { type: mongoose.Schema.Types.ObjectId, ref: "Internship" },
    answers: [{ questionId: String, selectedIndex: Number }],
    score: Number,
    passed: Boolean,
    startedAt: Date,
    submittedAt: Date,
    timeTaken: Number,
  },
  { timestamps: true },
);

// ─── PAYMENT MODEL ────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    gateway: { type: String, enum: ["razorpay", "stripe"] },
    orderId: String,
    paymentId: String,
    amount: Number,
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
const User = mongoose.model("User", userSchema);
const Course = mongoose.model("Course", courseSchema);
const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
const Certificate = mongoose.model("Certificate", certificateSchema);
const Internship = mongoose.model("Internship", internshipSchema);
const Application = mongoose.model("Application", applicationSchema);
const Lead = mongoose.model("Lead", leadSchema);
const Blog = mongoose.model("Blog", blogSchema);
const SiteSetting = mongoose.model("SiteSetting", siteSettingsSchema);
const Popup = mongoose.model("Popup", popupSchema);
const Analytics = mongoose.model("Analytics", analyticsSchema);
const AptitudeTest = mongoose.model("AptitudeTest", aptitudeTestSchema);
const TestAttempt = mongoose.model("TestAttempt", testAttemptSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const LiveClass = mongoose.model("LiveClass", liveClassSchema);
const SlotSchema = mongoose.model("Slot", SlotBookingSchema);

module.exports = {
  User,
  Course,
  Enrollment,
  Certificate,
  Internship,
  Application,
  Lead,
  Blog,
  SiteSetting,
  Popup,
  Analytics,
  AptitudeTest,
  TestAttempt,
  Payment,
  LiveClass,
  SlotSchema,
};
