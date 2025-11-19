const express = require('express');
const router = express.Router();
const {
  getAllProblems,
  getProblemById,
  updateProblem,
  deleteProblem,
  getdomains
} = require('../controllers/problemController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Public problem routes
router.get('/', getAllProblems);
router.get('/domains/list', getdomains);
router.get('/:id', getProblemById);

// Creator-only routes
router.put('/:id', updateProblem);
router.delete('/:id', deleteProblem);

module.exports = router;