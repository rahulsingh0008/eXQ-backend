const express = require('express');
const router = express.Router();
const {
  createTeam,
  joinTeam,
  getMyTeams,
  postProblem,
  getMyProblems,
  getPurchasedProblems,
  leaveTeam
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require authentication and student role
router.use(protect, authorize('student'));

// Team routes
router.post('/teams', createTeam);
router.post('/teams/join', joinTeam);
router.get('/teams/my-team', getMyTeams);
router.delete('/teams/leave', leaveTeam);

// Problem routes
router.post('/problems', postProblem);
router.get('/problems/my-problems', getMyProblems);
router.get('/problems/purchased', getPurchasedProblems);

module.exports = router;