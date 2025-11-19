const mongoose = require('mongoose');

/**
 * Upvote Schema - Track faculty upvotes on problems
 */
const upvoteSchema = new mongoose.Schema({
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  user: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }]
}, {
  timestamps: true
});

// Ensure one user can upvote a problem only once
upvoteSchema.index({ problem: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Upvote', upvoteSchema);