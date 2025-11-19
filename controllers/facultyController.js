const Team = require('../models/teamModel');
const Feedback = require('../models/feedbackModel');
const Problem = require('../models/problemModel');
const Upvote = require('../models/upvoteModel');

/**
 * @route   GET /api/faculty/teams
 * @desc    Get all teams (for browsing)
 * @access  Private (Faculty)
 */
const getAllTeams = async (req, res) => {
  try {
    const { department, page = 1, limit = 10 } = req.query;
    
    const query = { isActive: true };
    if (department) query.department = department;

    const teams = await Team.find(query)
      .populate('leader members', 'name email rollNumber department')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Team.countDocuments(query);

    res.json({
      teams,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/faculty/my-teams
 * @desc    Get teams assigned to the logged-in faculty
 * @access  Private (Faculty)
 */
const getMyTeams = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      isActive: true,
      assignedFaculty: req.user._id
    };

    const teams = await Team.find(query)
      .populate('leader members', 'name email rollNumber department')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Team.countDocuments(query);

    res.json({
      teams,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/faculty/teams/:id
 * @desc    Get team details
 * @access  Private (Faculty)
 */
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('leader members', 'name email rollNumber department year');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/faculty/feedback
 * @desc    Give feedback to a team
 * @access  Private (Faculty)
 */
const giveFeedback = async (req, res) => {
  try {
    const { teamId, content, rating, category } = req.body;

    // Verify team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const feedback = await Feedback.create({
      team: teamId,
      faculty: req.user._id,
      content,
      rating,
      category
    });

    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('faculty', 'name email department')
      .populate('team', 'name');

    res.status(201).json(populatedFeedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/faculty/feedback/team/:teamId
 * @desc    Get all feedback for a team
 * @access  Private (Faculty)
 */
const getTeamFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ team: req.params.teamId })
      .populate('faculty', 'name email department')
      .sort({ createdAt: -1 });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/faculty/problems/:id/upvote
 * @desc    Upvote or remove upvote on a problem
 * @access  Private (Faculty)
 */
const upvoteProblem = async (req, res) => {
  try {
    const problemId = req.params.id;

    // Check if problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const userId = req.user._id;

    // Check if already upvoted
    const hasUpvoted = problem.upvotedBy.some(id => id.toString() === userId.toString());
    const hasDownvoted = problem.downvotedBy.some(id => id.toString() === userId.toString());

    if (hasUpvoted) {
      // Remove upvote
      problem.upvotes -= 1;
      problem.upvotedBy = problem.upvotedBy.filter(id => id.toString() !== userId.toString());
      await problem.save();
      return res.json({ message: 'Upvote removed', upvoted: false, downvoted: false });
    }

    // If was downvoted, remove downvote first
    if (hasDownvoted) {
      problem.downvotes -= 1;
      problem.downvotedBy = problem.downvotedBy.filter(id => id.toString() !== userId.toString());
    }

    // Add upvote
    problem.upvotes += 1;
    problem.upvotedBy.push(userId);
    await problem.save();

    res.json({ message: 'Problem upvoted', upvoted: true, downvoted: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/faculty/problems/:id/downvote
 * @desc    Downvote or remove downvote on a problem
 * @access  Private (Faculty)
 */
const downvoteProblem = async (req, res) => {
  try {
    const problemId = req.params.id;

    // Check if problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const userId = req.user._id;

    // Check if already downvoted
    const hasUpvoted = problem.upvotedBy.some(id => id.toString() === userId.toString());
    const hasDownvoted = problem.downvotedBy.some(id => id.toString() === userId.toString());

    if (hasDownvoted) {
      // Remove downvote
      problem.downvotes -= 1;
      problem.downvotedBy = problem.downvotedBy.filter(id => id.toString() !== userId.toString());
      await problem.save();
      return res.json({ message: 'Downvote removed', upvoted: false, downvoted: false });
    }

    // If was upvoted, remove upvote first
    if (hasUpvoted) {
      problem.upvotes -= 1;
      problem.upvotedBy = problem.upvotedBy.filter(id => id.toString() !== userId.toString());
    }

    // Add downvote
    problem.downvotes += 1;
    problem.downvotedBy.push(userId);
    await problem.save();

    res.json({ message: 'Problem downvoted', upvoted: false, downvoted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/faculty/problems
 * @desc    Get all problems with filters
 * @access  Private (Faculty)
 */
const getAllProblems = async (req, res) => {
  try {
    const { domain, search, page = 1, limit = 10 } = req.query;
    
    const query = { isApproved: true };
    
    if (domain) query.domain = domain;
    if (search) {
      query.$text = { $search: search };
    }

    const problems = await Problem.find(query)
      .populate('createdBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ upvotes: -1, createdAt: -1 });

    const count = await Problem.countDocuments(query);

    res.json({
      problems,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/faculty/feedback/my-feedback
 * @desc    Get all feedback given by faculty
 * @access  Private (Faculty)
 */
const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ faculty: req.user._id })
      .populate('team', 'name members')
      .sort({ createdAt: -1 });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllTeams,
  getMyTeams,
  getTeamById,
  giveFeedback,
  getTeamFeedback,
  upvoteProblem,
  downvoteProblem,
  getAllProblems,
  getMyFeedback
};