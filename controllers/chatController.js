const Chat = require('../models/chatModel');
const Team = require('../models/teamModel');

/**
 * @route   GET /api/chats/team/:teamId
 * @desc    Get chat messages for a team
 * @access  Private (Team members only)
 */
const getTeamChats = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is part of the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isMember = team.members.some(
      member => member.toString() === req.user._id.toString()
    );

    if (!isMember && req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view team chats' });
    }

    // Get chat messages
    const chats = await Chat.find({ team: teamId })
      .populate('sender', 'name email rollNumber')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 }); // Get latest messages first

    const count = await Chat.countDocuments({ team: teamId });

    res.json({
      chats: chats.reverse(), // Reverse to show oldest first
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/chats/team/:teamId
 * @desc    Send a message to team chat
 * @access  Private (Team members only)
 */
const sendMessage = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify user is part of the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isMember = team.members.some(
      member => member.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to send messages to this team' });
    }

    // Create message
    const chat = await Chat.create({
      team: teamId,
      sender: req.user._id,
      message: message.trim()
    });

    // Populate sender details
    await chat.populate('sender', 'name email rollNumber');

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   PUT /api/chats/:id
 * @desc    Edit a message
 * @access  Private (Message sender only)
 */
const editMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (chat.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    chat.message = message.trim();
    chat.isEdited = true;
    await chat.save();

    await chat.populate('sender', 'name email rollNumber');

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   DELETE /api/chats/:id
 * @desc    Delete a message
 * @access  Private (Message sender or team leader)
 */
const deleteMessage = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Get team to check if user is leader
    const team = await Team.findById(chat.team);

    // Check if user is the sender or team leader
    const isSender = chat.sender.toString() === req.user._id.toString();
    const isLeader = team && team.leader.toString() === req.user._id.toString();

    if (!isSender && !isLeader && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Chat.findByIdAndDelete(req.params.id);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   PUT /api/chats/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Add user to readBy if not already present
    if (!chat.readBy.includes(req.user._id)) {
      chat.readBy.push(req.user._id);
      await chat.save();
    }

    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTeamChats,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead
};