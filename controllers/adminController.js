const User = require('../models/userModel');
const Team = require('../models/teamModel');
const Problem = require('../models/problemModel');
const Payment = require('../models/paymentModel');

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, department, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (department) query.department = department;

    const users = await User.find(query)
      .select('-password')
      .populate('team', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   PUT /api/admin/users/:id/toggle-status
 * @desc    Activate/Deactivate user
 * @access  Private (Admin)
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({ 
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: { ...user._doc, password: undefined }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // If user is part of a team, remove them
    if (user.team) {
      const team = await Team.findById(user.team);
      if (team) {
        team.members = team.members.filter(m => m.toString() !== user._id.toString());
        
        // If user was leader, transfer leadership or delete team
        if (team.leader.toString() === user._id.toString()) {
          if (team.members.length > 0) {
            team.leader = team.members[0];
            await team.save();
          } else {
            await Team.findByIdAndDelete(team._id);
          }
        } else {
          await team.save();
        }
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/admin/problems
 * @desc    Get all problems (including unapproved)
 * @access  Private (Admin)
 */
const getAllProblems = async (req, res) => {
  try {
    const { isApproved, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    const problems = await Problem.find(query)
      .populate('createdBy', 'name email rollNumber')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

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
 * @route   PUT /api/admin/problems/:id/approve
 * @desc    Approve/Reject problem
 * @access  Private (Admin)
 */
const approveProblem = async (req, res) => {
  try {
    const { approved } = req.body;
    
    const problem = await Problem.findById(req.params.id);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    problem.isApproved = approved;
    await problem.save();

    res.json({ 
      message: `Problem ${approved ? 'approved' : 'rejected'} successfully`,
      problem 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   DELETE /api/admin/problems/:id
 * @desc    Delete problem
 * @access  Private (Admin)
 */
const deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    await Problem.findByIdAndDelete(req.params.id);

    res.json({ message: 'Problem deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/admin/payments
 * @desc    Get all payment transactions
 * @access  Private (Admin)
 */
const getAllPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('user', 'name email rollNumber')
      .populate('problem', 'title price')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Payment.countDocuments(query);

    // Calculate total revenue
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      payments,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalFaculty = await User.countDocuments({ role: 'faculty' });
    const totalTeams = await Team.countDocuments();
    const totalProblems = await Problem.countDocuments();
    const approvedProblems = await Problem.countDocuments({ isApproved: true });
    const pendingProblems = await Problem.countDocuments({ isApproved: false });
    
    const totalPayments = await Payment.countDocuments({ status: 'success' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Recent activity
    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentProblems = await Problem.find()
      .select('title category isApproved createdAt')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalUsers,
        totalStudents,
        totalFaculty,
        totalTeams,
        totalProblems,
        approvedProblems,
        pendingProblems,
        totalPayments,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      },
      recentActivity: {
        recentUsers,
        recentProblems
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/admin/teams
 * @desc    Get all teams
 * @access  Private (Admin)
 */
const getAllTeams = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const teams = await Team.find()
      .populate('leader members', 'name email rollNumber')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Team.countDocuments();

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

module.exports = {
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAllProblems,
  approveProblem,
  deleteProblem,
  getAllPayments,
  getDashboardStats,
  getAllTeams
};