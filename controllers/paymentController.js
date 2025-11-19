const { razorpayInstance, verifyPaymentSignature } = require('../utils/razorpay');
const Payment = require('../models/paymentModel');
const Problem = require('../models/problemModel');
const User = require('../models/userModel');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order for problem purchase
 * @access  Private
 */
const createOrder = async (req, res) => {
  try {
    const { problemId } = req.body;

    // Check if problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Check if already purchased
    const user = await User.findById(req.user._id);
    const alreadyPurchased = user.purchasedProblems.some(
      p => p.toString() === problemId
    );

    if (alreadyPurchased) {
      return res.status(400).json({ message: 'Problem already purchased' });
    }

    // Check if user is the creator
    if (problem.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot purchase your own problem' });
    }

    // Create Razorpay order
    const options = {
      amount: problem.price * 100, // Amount in paise (₹60 = 6000 paise)
      currency: 'INR',
      receipt: `order_${problemId.substring(0,8)}_${Date.now()}`,
      notes: {
        problemId: problemId,
        userId: req.user._id.toString()
      }
    };

    const order = await razorpayInstance.orders.create(options);

    // Save payment record
    const payment = await Payment.create({
      user: req.user._id,
      problem: problemId,
      amount: problem.price,
      razorpayOrderId: order.id,
      status: 'pending'
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment and grant access to problem
 * @access  Private
 */
const verifyPayment = async (req, res) => {
  try {
    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature, 
      paymentId 
    } = req.body;

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature
    );

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update payment record
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'success';
    await payment.save();

    // Add problem to user's purchased list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { purchasedProblems: payment.problem }
    });

    // Increment purchase count
    await Problem.findByIdAndUpdate(payment.problem, {
      $inc: { purchaseCount: 1 }
    });

    res.json({ 
      message: 'Payment successful',
      success: true 
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/payments/failed
 * @desc    Handle failed payment
 * @access  Private
 */
const paymentFailed = async (req, res) => {
  try {
    const { paymentId, error } = req.body;

    const payment = await Payment.findById(paymentId);
    
    if (payment) {
      payment.status = 'failed';
      await payment.save();
    }

    res.json({ 
      message: 'Payment failed', 
      error: error || 'Payment was cancelled or failed' 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/payments/my-payments
 * @desc    Get user's payment history
 * @access  Private
 */
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('problem', 'title category price')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment details
 * @access  Private
 */
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('problem', 'title category price');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user is authorized
    if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  paymentFailed,
  getMyPayments,
  getPaymentById
};