const express = require("express");
const router = express.Router();
const { SlotSchema } = require("../models"); // Ensure this path points to your models file

// POST API Endpoint: /api/saturday-class/enroll
router.post("/enroll", async (req, res) => {
  try {
    const { name, whatsapp, email } = req.body;

    console.log("this is the slot detials : ", req.body);

    // 1. Strict Validation for required form details
    if (!name || !whatsapp) {
      return res.status(400).json({
        success: false,
        message: "Please provide both name and WhatsApp number.",
      });
    }

    // 2. Safeguard for Mongoose's strict required email rule
    // If the student leaves email blank, use a safe default fallback string
    const emailFallback =
      email && email.trim() !== "" ? email : `${whatsapp}@zentrox.temporary`;

    // 3. Create entry matching your SlotBookingSchema definitions precisely
    const newBooking = await SlotSchema.create({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      email: emailFallback,
      scheduledSaturday: new Date(), // Populates tracking parameters
    });

    console.log("New booking is created : ", newBooking);

    // 4. Return the exact success text requested for the client-side state mapping
    return res.status(201).json({
      success: true,
      message: "your slot it successfully booked",
      data: newBooking,
    });
  } catch (error) {
    console.error("Enrollment Handler Exception:", error);

    // Catch duplicate key errors if the collection enforces uniqueness behind the scenes
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This slot has already been reserved.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please check your data.",
    });
  }
});

router.get("/enrollments", async (req, res) => {
  try {
    // Fetch all slot bookings, sorted with newest first
    const studentSlots = await SlotSchema.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: studentSlots.length,
      data: studentSlots,
    });
  } catch (error) {
    console.error("Fetch Enrollments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load student enrollment data.",
    });
  }
});

module.exports = router;
