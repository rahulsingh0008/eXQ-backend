const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAllProblems,
  approveProblem,
  deleteProblem,
  getAllPayments,
  getDashboardStats,
  getAllTeams
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require authentication and admin role
router.use(protect, authorize('admin'));

router.get('/', (req, res) => {
  res.send('<h1>Coming soon</h1>')
})

// Dashboard
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// Team management
router.get('/teams', getAllTeams);

// Problem management
router.get('/problems', getAllProblems);
router.put('/problems/:id/approve', approveProblem);
router.delete('/problems/:id', deleteProblem);

// Payment management
router.get('/payments', getAllPayments);

module.exports = router;