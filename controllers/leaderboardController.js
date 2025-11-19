const User = require('../models/userModel');
const Team = require('../models/teamModel');
const Feedback = require('../models/feedbackModel');
const Problem = require('../models/problemModel');

/**
 * @route   GET /api/leaderboard/faculty
 * @desc    Get faculty leaderboard (visible to any logged-in user)
 *          Score is based on assigned teams, feedback given, and upvotes.
 */
const getFacultyLeaderboard = async (req, res) => {
  try {
    // All active faculty
    const faculty = await User.find({ role: 'faculty', isActive: true })
      .select('name email department')
      .lean();

    if (!faculty.length) {
      return res.json({ leaderboard: [] });
    }

    const facultyIds = faculty.map(f => f._id);

    // Teams assigned as mentors
    const teamAgg = await Team.aggregate([
      { $match: { assignedFaculty: { $in: facultyIds } } },
      { $group: { _id: '$assignedFaculty', count: { $sum: 1 } } }
    ]);

    // Feedback given
    const feedbackAgg = await Feedback.aggregate([
      { $match: { faculty: { $in: facultyIds } } },
      { $group: { _id: '$faculty', count: { $sum: 1 } } }
    ]);

    // Upvotes given (faculty appearing in problems.upvotedBy)
    const upvoteAgg = await Problem.aggregate([
      { $match: { upvotedBy: { $exists: true, $ne: [] } } },
      { $project: { upvotedBy: 1 } },
      { $unwind: '$upvotedBy' },
      { $match: { upvotedBy: { $in: facultyIds } } },
      { $group: { _id: '$upvotedBy', count: { $sum: 1 } } }
    ]);

    const teamMap = Object.fromEntries(teamAgg.map(t => [t._id.toString(), t.count]));
    const feedbackMap = Object.fromEntries(feedbackAgg.map(f => [f._id.toString(), f.count]));
    const upvoteMap = Object.fromEntries(upvoteAgg.map(u => [u._id.toString(), u.count]));

    const leaderboard = faculty.map(f => {
      const id = f._id.toString();
      const assignedTeams = teamMap[id] || 0;
      const feedbackCount = feedbackMap[id] || 0;
      const upvotesGiven = upvoteMap[id] || 0;
      const score = assignedTeams * 3 + feedbackCount * 2 + upvotesGiven;

      return {
        id: f._id,
        name: f.name,
        email: f.email,
        department: f.department || 'N/A',
        assignedTeams,
        feedbackCount,
        upvotesGiven,
        score
      };
    }).sort((a, b) => b.score - a.score);

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFacultyLeaderboard
};


