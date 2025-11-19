const Team = require('../models/teamModel');
const User = require('../models/userModel');
const Problem = require('../models/problemModel');

/**
 * @route   POST /api/students/teams
 * @desc    Create a new team
 * @access  Private (Student)
 */
const createTeam = async (req, res) => {
  try {
    const { name, description, maxMembers, department } = req.body;

    // Create team
    const team = await Team.create({
      name,
      description,
      leader: req.user._id,
      members: [req.user._id],
      maxMembers: maxMembers || 4,
      department
    });

    // Add team to user's teams array
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { teams: team._id } });

    res.status(201).json(team);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Team name already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/students/teams/join
 * @desc    Join a team using invite code
 * @access  Private (Student)
 */
const joinTeam = async (req, res) => {
  try {
    const { name } = req.body;
    // Find team by name first
    const team = await Team.findOne({ name });
    if (!team) {
      return res.status(404).json({ message: 'No such team exists' });
    }

    // If already a member, reject early
    if (team.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You are already in this team' });
    }

    // Atomically try to add user to team's members only if there's capacity
    // Use $expr with $size to compare current members length with maxMembers
    const updatedTeam = await Team.findOneAndUpdate(
      { _id: team._id, $expr: { $lt: [ { $size: '$members' }, '$maxMembers' ] } },
      { $addToSet: { members: req.user._id } },
      { new: true }
    ).populate('members leader', 'name email rollNumber');

    if (!updatedTeam) {
      // Could be full or race condition; inform client
      return res.status(400).json({ message: 'Team is full or cannot be joined right now' });
    }

    // Add team to user's teams array
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { teams: team._id } });

    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/students/teams/my-team
 * @desc    Get current user's teams (can belong to multiple teams)
 * @access  Private (Student)
 */
const getMyTeams = async (req, res) => {
  try {
    // Get the populated user to get their teams
    const user = await User.findById(req.user._id).populate({
      path: 'teams',
      populate: { path: 'members leader', select: 'name email rollNumber department' }
    });

    if (!user.teams || user.teams.length === 0) {
      return res.status(404).json({ message: 'You are not part of any team' });
    }

    // Return the teams array
    res.json(user.teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/students/problems
 * @desc    Post a new problem
 * @access  Private (Student)
 */
const postProblem = async (req, res) => {
  try {
    const { title, description, domain } = req.body;

    const problem = await Problem.create({
      title,
      description,
      domain,
      createdBy: req.user._id
    });

    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/students/problems/my-problems
 * @desc    Get problems posted by current user
 * @access  Private (Student)
 */
const getMyProblems = async (req, res) => {
  try {
    const problems = await Problem.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/students/problems/purchased
 * @desc    Get purchased problems
 * @access  Private (Student)
 */
const getPurchasedProblems = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'purchasedProblems',
      populate: { path: 'createdBy', select: 'name email' }
    });

    res.json(user.purchasedProblems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   DELETE /api/students/teams/leave
 * @desc    Leave a team
 * @access  Private (Student)
 */
const leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // If user is leader, transfer leadership or delete team
    if (team.leader.toString() === req.user._id.toString()) {
      if (team.members.length > 1) {
        // Transfer leadership to next member
        team.leader = team.members[1];
        team.members = team.members.filter(m => m.toString() !== req.user._id.toString());
        await team.save();
      } else {
        // Delete team if only member
        await Team.findByIdAndDelete(team._id);
      }
    } else {
      // Remove member from team
      team.members = team.members.filter(m => m.toString() !== req.user._id.toString());
      await team.save();
    }

    // Remove team from user's teams array
    await User.findByIdAndUpdate(req.user._id, { $pull: { teams: teamId } });

    res.json({ message: 'Successfully left the team' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTeam,
  joinTeam,
  getMyTeams,
  postProblem,
  getMyProblems,
  getPurchasedProblems,
  leaveTeam
};