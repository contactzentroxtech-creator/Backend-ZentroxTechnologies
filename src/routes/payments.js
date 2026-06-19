// payments.js
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');
const { Payment, Course, Enrollment, User } = require('../models');
const { protect } = require('../middleware/authMiddleware');

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/razorpay/order
router.post('/razorpay/order', protect, async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: (course.discountPrice || course.price) * 100,
      currency: 'INR',
      receipt: `ZT_${Date.now()}`,
      notes: { courseId: course._id.toString(), userId: req.user._id.toString() },
    });

    await Payment.create({
      user: req.user._id, course: courseId, gateway: 'razorpay',
      orderId: order.id, amount: course.discountPrice || course.price, status: 'created',
    });

    res.json({ success: true, data: { orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID } });
  } catch (err) { next(err); }
});

// POST /api/payments/razorpay/verify
router.post('/razorpay/verify', protect, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    await Payment.findOneAndUpdate({ orderId: razorpay_order_id }, { paymentId: razorpay_payment_id, status: 'paid' });

    // Enroll user
    const existing = await Enrollment.findOne({ user: req.user._id, course: courseId });
    if (!existing) {
      await Enrollment.create({ user: req.user._id, course: courseId, paymentId: razorpay_payment_id, amountPaid: req.body.amount });
      await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { enrolledCourses: courseId } });
    }

    res.json({ success: true, message: 'Payment verified. Enrollment confirmed!' });
  } catch (err) { next(err); }
});

module.exports = router;
