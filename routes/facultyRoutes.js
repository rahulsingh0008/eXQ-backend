const express = require('express');
const router = express.Router();
const {
  getAllTeams,
  getMyTeams,
  getTeamById,
  giveFeedback,
  getTeamFeedback,
  upvoteProblem,
  downvoteProblem,
  getAllProblems,
  getMyFeedback
} = require('../controllers/facultyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require authentication and faculty role
router.use(protect, authorize('faculty'));

// Team routes
router.get('/teams', getAllTeams);
router.get('/my-teams', getMyTeams);
router.get('/teams/:id', getTeamById);

// Feedback routes
router.post('/feedback', giveFeedback);
router.get('/feedback/team/:teamId', getTeamFeedback);
router.get('/feedback/my-feedback', getMyFeedback);

// Problem routes
router.get('/problems', getAllProblems);
router.post('/problems/:id/upvote', upvoteProblem);
router.post('/problems/:id/downvote', downvoteProblem);

module.exports = router;