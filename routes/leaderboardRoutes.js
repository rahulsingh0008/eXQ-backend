const express = require('express');
const router = express.Router();
const { getFacultyLeaderboard } = require('../controllers/leaderboardController');
const { protect } = require('../middleware/authMiddleware');

// All leaderboard routes require authentication (students + faculty + admin)
router.use(protect);

// Faculty leaderboard
router.get('/faculty', getFacultyLeaderboard);

module.exports = router;


