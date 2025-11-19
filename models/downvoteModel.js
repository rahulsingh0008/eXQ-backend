const mongoose = require('mongoose');

/**
 * Downvote Schema - Track faculty downvotes on problems
 */
const downvoteSchema = new mongoose.Schema({
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

// Ensure one user can downvote a problem only once
downvoteSchema.index({ problem: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Downvote', downvoteSchema);
