const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  paymentFailed,
  getMyPayments,
  getPaymentById
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Payment routes
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/failed', paymentFailed);
router.get('/my-payments', getMyPayments);
router.get('/:id', getPaymentById);

module.exports = router;