const Problem = require('../models/problemModel');
const User = require('../models/userModel');

/**
 * @route   GET /api/problems
 * @desc    Get all approved problems (Problem Store) - faculty sees all details, students see limited info
 * @access  Private
 */
const getAllProblems = async (req, res) => {
  try {
    const { domain, page = 1, limit = 12, sort = 'latest' } = req.query;
    const isFaculty = req.user.role === 'faculty';
    
    const query = { };
    
    if (domain) query.domain = domain;

    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { upvotes: -1 };
        break;
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Faculty sees all details, students see limited info
    const selectFields = isFaculty 
      ? '_id title description domain upvotes upvotedBy downvotes downvotedBy price createdBy createdAt'
      : '_id domain upvotes upvotedBy downvotes downvotedBy price createdAt';

    const problems = await Problem.find(query)
      .select(selectFields)
      .populate('createdBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOption);

    const count = await Problem.countDocuments(query);

    const userId = req.user._id.toString();

    // Add hasUpvoted / hasDownvoted flags so frontend can show visual state in the list
    const problemsWithFlags = problems.map(p => {
      const doc = p.toObject();
      const upvotedBy = doc.upvotedBy || [];
      const downvotedBy = doc.downvotedBy || [];

      const hasUpvoted = upvotedBy.some(id => id.toString() === userId);
      const hasDownvoted = downvotedBy.some(id => id.toString() === userId);

      return {
        ...doc,
        hasUpvoted,
        hasDownvoted
      };
    });

    res.json({
      problems: problemsWithFlags,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/problems/:id
 * @desc    Get single problem details - faculty sees all, students see full details only if purchased
 * @access  Private
 */
const getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const isFaculty = req.user.role === 'faculty';
    const user = await User.findById(req.user._id);
    const hasPurchased = user.purchasedProblems.some(
      p => p.toString() === problem._id.toString()
    );
    const hasUpvoted = problem.upvotedBy.some(
      id => id.toString() === req.user._id.toString()
    );
    const hasDownvoted = problem.downvotedBy.some(
      id => id.toString() === req.user._id.toString()
    );

    // Faculty can always see full details
    if (isFaculty) {
      return res.json({
        ...problem._doc,
        hasPurchased: false,
        hasUpvoted,
        hasDownvoted,
        isFaculty: true
      });
    }

    // Students: if not purchased, only return domain, upvotes, downvotes, and price
    if (!hasPurchased) {
      return res.json({
        _id: problem._id,
        domain: problem.domain,
        upvotes: problem.upvotes,
        upvotedBy: problem.upvotedBy,
        downvotes: problem.downvotes,
        downvotedBy: problem.downvotedBy,
        price: problem.price,
        hasPurchased: false,
        hasUpvoted,
        hasDownvoted,
        message: 'Purchase this problem to unlock full details'
      });
    }

    // Students who purchased: return all details
    const response = {
      ...problem._doc,
      hasPurchased: true,
      hasUpvoted,
      hasDownvoted
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   PUT /api/problems/:id
 * @desc    Update problem
 * @access  Private (Creator only)
 */
const updateProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Check if user is the creator
    if (problem.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this problem' });
    }

    const { title, description, domain, price } = req.body;

    problem.title = title || problem.title;
    problem.description = description || problem.description;
    problem.domain = domain || problem.domain;
    problem.price = price !== undefined ? price : problem.price;

    // Reset approval if admin modifies
    if (req.user.role !== 'admin') {
      problem.isApproved = false;
    }

    const updatedProblem = await problem.save();

    res.json(updatedProblem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   DELETE /api/problems/:id
 * @desc    Delete problem
 * @access  Private (Creator only or Admin)
 */
const deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Check if user is the creator or admin
    if (problem.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this problem' });
    }

    await Problem.findByIdAndDelete(req.params.id);

    res.json({ message: 'Problem deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/problems/subjects/list
 * @desc    Get all subjects
 * @access  Private
 */
const getdomains = async (req, res) => {
  try {
    // Get all distinct domains from problems
    const domains = await Problem.distinct('domain');
    
    // If no domains found, return common academic domains as fallback
    if (!domains || domains.length === 0) {
      return res.json([
        'Data Structures',
        'Algorithms',
        'Web Development',
        'Database Design',
        'Computer Networks',
        'Operating Systems',
        'Software Engineering',
        'Machine Learning',
        'Cybersecurity',
        'Mobile Development'
      ]);
    }
    
    // Sort domains alphabetically
    const sortedDomains = domains.sort();
    res.json(sortedDomains);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllProblems,
  getProblemById,
  updateProblem,
  deleteProblem,
  getdomains
};