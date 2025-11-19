const mongoose = require('mongoose');

/**
 * Feedback Schema - Faculty can give feedback to teams
 */
const feedbackSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Feedback content is required']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);